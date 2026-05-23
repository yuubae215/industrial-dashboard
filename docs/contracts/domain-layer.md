# Domain Layer Contracts

> Implementations that violate the prohibitions in this document receive a 🟥 Red Card (merge rejection).

Reference: [PHILOSOPHY.md](../../PHILOSOPHY.md) Axioms 1 & 2 / [ADR-005](../adr/adr-005-ssot-state-management.md) / [ADR-007](../adr/adr-007-branded-types.md)

---

## Contract 1: SSOT Enforcement

**What MAY be stored (store state):**
- `PlcRawValue[]` — raw values received from the PLC
- `number` (Unix ms) — reception timestamp
- `ConnectionStatus` — connection state enum

**What MUST NOT be stored (compute each time):**
- Scaled `EngineeringValue` ← 🟥
- Delta or change amount from the previous value ← 🟥
- Alert flags (threshold comparison results) ← 🟥
- Formatted display strings ← 🟥

---

## Contract 2: Mandatory Branded Type Usage

**Allowed:**
- Creating typed values using constructor functions in `branded.ts` (e.g., `asPlcRawValue()`)

**Prohibited:**
- Mixing `PlcRawValue` and `EngineeringValue` in arithmetic operations ← 🟥
- Force-casting branded types with `as unknown as TargetType` ← 🟥
- Directly assigning a `number` to a `PlcRawValue` typed variable ← 🟥

---

## Contract 3: Validation Boundary

Validation (range checks, existence checks) is performed **only at system boundaries**:
- When receiving Tauri command arguments (Rust side)
- Immediately after receiving a Tauri command response (TypeScript side `invoke()` callback)

**Prohibited:**
- Performing validation inside pure domain functions (transform functions, getters) ← 🟥
- Writing validation error fallback handling inside component `render` ← 🟥

---

## Contract 4: State Transition Rules

**ConnectionStatus transitions:**

```
Disconnected → Connecting → Connected → Disconnecting → Disconnected
                                ↓
                            Error (awaiting retry)
```

- Direct transitions not in the diagram above (e.g., `Connected → Disconnected` skip) are prohibited ← 🟥
- Automatic retry on error is handled by the Rust side (exponential backoff in ADR-003)
- The frontend provides retry UI but must not own timing control ← 🟥
