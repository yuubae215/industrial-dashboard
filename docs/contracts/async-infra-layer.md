# Async Infrastructure Layer Contracts

> Implementations that violate the prohibitions in this document receive a 🟥 Red Card (merge rejection).

Reference: [PHILOSOPHY.md](../../PHILOSOPHY.md) Axiom 3 / [ADR-003](../adr/adr-003-plc-connection.md)

---

## Contract 1: Absolute UI Thread Protection

Blocking the frontend main thread (React's synchronous processing) for more than 16ms (equivalent to 60fps) is prohibited.

**Allowed:**
- Executing PLC communication via `invoke()` Tauri commands (Rust's tokio runtime)
- Caching heavy pure computations with `useMemo`

**Prohibited:**
- Calling `await invoke()` within a render function's synchronous flow ← 🟥
- Running synchronous heavy loops inside `useEffect` ← 🟥
- Implementing 500ms polling with a combination of `setInterval` + synchronous processing ← 🟥

---

## Contract 2: Tauri Command Responsibility

Each Tauri command (`invoke()`) has **single responsibility**.

| Command | Responsibility |
|---------|---------------|
| `plc_read_mitsubishi` | One read only |
| `plc_read_keyence` | One read only |
| `plc_write_keyence` | One write only |
| `mtls_get` | One HTTP GET only |
| `mtls_post` | One HTTP POST only |

**Prohibited:**
- Running polling loops inside a command (manage on the frontend side or in a Rust separate task) ← 🟥
- One command accessing multiple PLCs in series ← 🟥

---

## Contract 3: Polling Management

500ms polling is implemented with the following pattern:

```typescript
// Allowed pattern: manage interval in useEffect, invoke is fired asynchronously
useEffect(() => {
  const id = setInterval(async () => {
    const result = await invoke<ReadResult>('plc_read_mitsubishi', { ... })
    store.updateRawValues(plcId, result.values, Date.now())
  }, 500)
  return () => clearInterval(id)
}, [plcId])
```

**Prohibited:**
- Making polling blocking by awaiting (pattern of sending the next request only after receiving the previous response) ← 🟥
  - Reason: PLC response delays directly reduce the dashboard update frequency
- Controlling polling interval via frontend component Props ← 🟥
  - Reason: Polling configuration belongs to `PlcConfig` (Rust-side SSOT)

---

## Contract 4: Error Retry

Exponential backoff retry (ADR-003) is implemented in a **Rust-side task**.

**Prohibited:**
- Implementing connection retry using `setTimeout` inside frontend `useEffect` ← 🟥
- Managing retry count in frontend state (`useState`) ← 🟥
