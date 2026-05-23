# ADR-005: SSOT State Management Strategy

## Status

Accepted (2026-05-23)

## Context

In this industrial dashboard, data flows in from multiple PLCs every 500ms. How this data is stored is the primary factor determining whether bugs arise.

Bug patterns observed in similar past systems:
- A UI component receives a PLC raw value, then accumulates "delta from the previous value" internally to update the display value
- After a communication error and reconnection, the stale previous value remains, causing incorrect deltas to accumulate
- The display value drifts from reality, leading operators to make wrong decisions

The root cause is that "delta accumulation" is saved as state.

## Options Considered

| Option | Description | Problem |
|--------|-------------|---------|
| A. Delta update (component-local) | Each component holds the previous value and computes deltas | State is scattered and self-amplifying bugs occur |
| B. Global store (delta update) | Hold previous value globally (e.g., Redux) and update with deltas | The delta accumulation problem is not solved |
| C. SSOT + forward calculation (adopted) | Store only PLC raw values; derive display values each frame via pure functions | Per-frame computation cost, negligible for PLC data volumes |

## Decision

**Adopt SSOT + forward calculation (Option C).**

State management principles:

```
[What MAY be stored (SSOT)]
  - Raw values received from PLC: PlcRawValue[]
  - Timestamp: number (Unix ms)
  - Connection status: ConnectionStatus

[What MUST NOT be stored (derived values)]
  - Scaled engineering values (compute every time)
  - Delta from previous value
  - Alert flags (threshold comparison results)
  - Formatted display strings
```

State management library: **Zustand**
- Minimal API that makes SSOT principles easy to enforce
- State can be read outside React (good affinity with Tauri event listeners)
- Less boilerplate than Redux; easier for the Coding Agent to use correctly

## Store Structure (Overview)

```typescript
interface PlcStore {
  // SSOT: store only PLC raw values
  rawValues: Map<string, PlcRawValue[]>
  timestamps: Map<string, number>
  connectionStatus: Map<string, ConnectionStatus>

  // Actions (called from Tauri events)
  updateRawValues: (plcId: string, values: PlcRawValue[], ts: number) => void
  setConnectionStatus: (plcId: string, status: ConnectionStatus) => void
}

// Display values computed as derived (getter) each time
const engineeringValue = (raw: PlcRawValue, scale: number): EngineeringValue =>
  (raw * scale) as EngineeringValue
```

## Rationale

1. **Eliminate self-amplifying bugs:** With no delta accumulation, state is automatically clean after a communication error and reconnection
2. **Predictability:** The same pure function applied to the same SSOT always produces the same display value
3. **Safety of AI-generated code:** Prohibiting "add to delta" patterns at the architecture level reduces the chance of the Coding Agent generating incorrect code

## Consequences

- Combined with branded types (ADR-007): mixing `PlcRawValue` and `EngineeringValue` in arithmetic causes a compile error
- Combined with yellow/red cards (ADR-006): discovering a delta-calculation pattern triggers a yellow card

## Related ADRs

- [PHILOSOPHY.md](../../PHILOSOPHY.md) — Axiom 2 (SSOT)
- [ADR-007](./adr-007-branded-types.md) — Branded types
- [docs/contracts/domain-layer.md](../contracts/domain-layer.md) — Domain layer contracts
