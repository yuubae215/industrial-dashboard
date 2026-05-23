# PLC Protocol Layer Contracts

> Implementations that violate the prohibitions in this document receive a 🟥 Red Card (merge rejection).

Reference: [PHILOSOPHY.md](../../PHILOSOPHY.md) Axiom 1 / [ADR-003](../adr/adr-003-plc-connection.md)

---

## Contract 1: Protocol Purity

`src-tauri/src/plc/mitsubishi.rs` and `src-tauri/src/plc/keyence.rs` must be **"pure converters that only send/receive byte sequences / ASCII text and return raw values."**

**Allowed:**
- Frame construction (device code, start number, point count → byte sequence)
- Response parsing (byte sequence / ASCII → `Vec<i32>`)
- Protocol-level error detection (end code, `!` prefix, etc.)

**Prohibited:**
- Writing conditional branches for polling interval or retry interval inside the protocol implementation ← 🟥
- Business logic tied to specific device addresses (e.g., "D1000 is a thermometer, so…") ← 🟥
- Logging the meaning of device values via `println!` / `log::info!` (e.g., "temperature is high") ← 🟥
- Branching on whether `PlcConfig`'s `host` field is an IP or FQDN (handle at the validation boundary) ← 🟥

---

## Contract 2: Tauri Command and Protocol Layer Contract

Tauri commands in `lib.rs` have only the following responsibilities:

1. Map arguments received from the frontend into a struct (`PlcConfig`)
2. Call the protocol implementation function
3. Serialize and return the result (`ReadResult` or `PlcError`) as-is

**Prohibited:**
- Writing retry loops inside Tauri commands (handle in Rust connection pool or a separate task) ← 🟥
- Performing device value threshold checks inside Tauri commands ← 🟥
- Swallowing `PlcError` and returning a fallback value like `Ok(vec![0])` ← 🟥

---

## Contract 3: Error Transparency

All variants of `PlcError` must be propagated **as-is** to the frontend.

```
Connection(io::Error)  →  frontend ConnectionStatus::Error
Protocol(String)       →  frontend AlertState::ProtocolError
Timeout                →  frontend ConnectionStatus::Timeout
```

**Prohibited:**
- Silently handling errors with `unwrap_or_default()` ← 🟥
- Returning a `Protocol` error as a `Connection` error (misrepresenting the type) ← 🟥

---

## Contract 4: Protocol Implementation Independence

The Mitsubishi and Keyence protocol implementations must **never depend on each other**.

- Shared types (`PlcConfig`, `ReadResult`, `PlcError`) are defined only in `plc/mod.rs`
- `mitsubishi.rs` importing `keyence.rs` is prohibited ← 🟥
- `keyence.rs` importing `mitsubishi.rs` is prohibited ← 🟥
