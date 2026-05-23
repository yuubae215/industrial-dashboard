# ADR-007: Branded Type Strategy (TypeScript + Rust)

## Status

Accepted (2026-05-23)

## Context

In this industrial dashboard, multiple domain concepts share the same primitive types (`number` / `string`) but **must never be mixed**:

- `PlcRawValue` (raw integer received from PLC) vs `EngineeringValue` (scaled engineering value)
- `DeviceAddress` (PLC device number) vs general `number`
- `SanitizedUrl` (validated URL) vs raw string

At runtime, all are the same type (`number` or `string`), so incorrect mixing is only caught at test time or in production. We need a mechanism to automatically detect "dangerous mixing" at compile time.

## TypeScript: Branded Types

Attach a "brand" to TypeScript's structural type system to detect mixing at compile time.

Adopted pattern (intersection type):

```typescript
type PlcRawValue = number & { readonly _brand: 'PlcRawValue' }
type EngineeringValue = number & { readonly _brand: 'EngineeringValue' }
```

- Branded values can only be created via constructor functions (e.g., `asPlcRawValue()`)
- Arithmetic operations between different branded types cause compile errors
- `strict: true` in `tsconfig.json` is already enabled; no additional configuration needed

See `src/types/branded.ts` for the implementation.

## Rust: Newtype Pattern

Rust achieves equivalent safety with the "newtype" pattern:

```rust
struct DeviceAddress(u32);
struct PortNumber(u16);
struct TimeoutMs(u64);
```

**Rust-side branded type implementation is deferred to a future task; this ADR only establishes the strategy.**
Reason: The current backend (`plc/mod.rs`) functions with primitive types. Migration to newtypes affects Tauri command serialization (serde), so it should be done incrementally alongside the frontend SSOT implementation.

## Scope

| Category | Branded Type | File |
|----------|-------------|------|
| PLC raw value | `PlcRawValue` | `src/types/branded.ts` |
| Engineering value | `EngineeringValue` | `src/types/branded.ts` |
| Device address | `DeviceAddress` | `src/types/branded.ts` |
| Validated URL | `SanitizedUrl` | `src/types/branded.ts` |
| Port number | `PortNumber` | `src/types/branded.ts` |

## Prohibitions

- Branded types must not be force-cast with `as unknown as TargetType` (only constructor functions in `branded.ts` are allowed)
- Branded types and raw primitives must not be mixed in arithmetic operations
- Rust newtypes must not be unwrapped via `.0` to use as raw values (applies to future implementation)

## Rationale

1. **Compile-time safety:** `tsc` automatically rejects bugs before they reach runtime
2. **Types as documentation:** The name `PlcRawValue` communicates to everyone reading the code (including AI) that "this is a raw value, not yet converted"
3. **Zero cost:** At runtime it is just a plain `number`/`string`, so no execution overhead

## Related ADRs

- [PHILOSOPHY.md](../../PHILOSOPHY.md) — Axiom 2 (SSOT)
- [ADR-005](./adr-005-ssot-state-management.md) — SSOT state management
- [src/types/branded.ts](../../src/types/branded.ts) — Implementation
- [docs/contracts/domain-layer.md](../contracts/domain-layer.md) — Domain layer contracts
