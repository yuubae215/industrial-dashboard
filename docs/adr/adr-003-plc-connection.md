# ADR-003: PLC Connection Management (Mitsubishi MC Protocol / Keyence Upper Link)

## Status

Accepted (2026-05-23)

## Context

We communicate via TCP with PLCs in the factory (Mitsubishi MELSEC series / Keyence KV series). A decision is needed on whether to maintain persistent connections or connect on-demand.

Target protocols:
- **Mitsubishi MELSEC:** MC Protocol (3E frame, binary mode, TCP)
- **Keyence KV series:** Upper Link communication (ASCII text-based, TCP)

## Options Considered

### Method A: Polling (persistent connection + periodic reads)

Establish a TCP connection at app startup, maintain it, and periodically read data at a fixed interval (e.g., 500ms). Distribute acquired data to the frontend via Tauri `emit`.

- **Pros:** Low latency, no connection establishment overhead, high real-time performance
- **Cons:** Requires reconnection logic on disconnect; must stay within PLC connection count limits

### Method B: Per-command connection (on-demand)

Establish a TCP connection for each frontend request (Invoke), read data, then close.

- **Pros:** Simple implementation, no connection management needed
- **Cons:** TCP handshake overhead on every request; unsuitable for real-time updates

## Decision

**Adopt Method A (persistent connection + polling).**

Implement automatic reconnection with exponential backoff on disconnect.

## Rationale

1. **Dashboard use case:** The primary purpose is a monitoring screen that continuously updates data at sub-second intervals
2. **PLC-side load:** On-demand connections trigger PLC processing on every TCP establishment; persistent connections are more stable
3. **FA communication convention:** Persistent connections are standard practice in FA communications interfacing with ladder programs

## Implementation

### Architecture

```
[Frontend (React)]
      │ tauri::invoke / tauri::listen
      ▼
[Tauri Command / Event (lib.rs)]
      │ channel / mutex
      ▼
[PollingTask (tokio spawn)]
  ├── Mitsubishi: TCP + MC Protocol 3E Frame
  └── Keyence: TCP + Upper Link ASCII
```

### Connection Management

Connections are managed via Tauri `AppState` (`Mutex<HashMap<plc_id, PlcConnection>>`).

### Reconnection Logic

Retry with exponential backoff (initial 1s → 2s → 4s → max 30s). Notify the frontend with "connecting" status during reconnection.

### Polling Interval

Default 500ms. Dynamically configurable from the frontend.

## Protocol Specification Notes

### Mitsubishi MC Protocol 3E Frame (Binary)

```
[Request frame]
50 00          : Sub-header (3E frame)
00             : Network number
FF             : PC number
FF 03          : Destination unit I/O number
00             : Destination unit station number
LL LL          : Request data length (little-endian)
10 00          : Monitoring timer (16 × 250ms = 4s)
01 04          : Command (batch read: 0x0401)
00 00          : Sub-command (word units)
HH HH HH      : Starting device number (3 bytes LE)
CC             : Device code (D=0xA8, M=0x90, W=0xB4)
NN NN          : Number of devices (LE)
```

### Keyence Upper Link

```
Read:   RDS DM1000.U 10\r\n
Reply:  100 200 300 ... (space-separated + \r\n)

Write:  WRS DM1000.U 1 100\r\n
Reply:  OK\r\n
```

## Consequences

- `tokio` async runtime is required
- Must implement `AppState` management for multiple PLC connections in Tauri
- Must stay within the PLC's maximum connection count (Mitsubishi: typically 8–32)

## Related ADRs

- [ADR-001](./adr-001-framework.md) - Framework selection
- [ADR-002](./adr-002-mtls-cert-management.md) - mTLS certificate management
