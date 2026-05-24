# Yellow Card Ledger

> **Purpose:** Track "at-risk implementation patterns" that threaten the design philosophy (PHILOSOPHY.md) axioms.
> When the cumulative count exceeds 3, escalate to red card → evaluate ascension to `docs/contracts/`.
>
> **Operating Rules (ADR-006):**
> - When the same pattern is found in a different location, update the relevant entry's `locations` and `count`
> - When `count >= 3`, issue a red card via PR + propose ascension to contracts
> - Entries that have ascended to contracts are removed from this file and marked `[ascended]`

---

## Active Yellow Cards

## YC-001: Side effects executed via `useState` initializer during render

- **Discovered:** 2026-05-23
- **Violates Axiom:** Axiom 2 (SSOT — no side effects during render), Axiom 3 (UI thread protection)
- **Locations:**
  - `src/components/Dashboard.tsx:53` — `setInterval` set up inside `useState` initializer (cleanup never called)
  - `src/components/Dashboard.tsx:72` — Zustand action `setThreshold` called inside `useState` initializer during render
- **Pattern:** Using `useState(() => { sideEffect() })` as a substitute for `useEffect`. The React `useState` initializer runs only once on mount and its return value is stored as initial state — React never calls it as a cleanup function. This causes timer leaks and undefined behavior in React 18 Concurrent Mode when external state is mutated during the render phase.
- **Count:** 2 / 3
- **Status:** Monitoring — fixed in this PR; watching for recurrence

## YC-002: Branded type bypass via `persist` middleware rehydration

- **Discovered:** 2026-05-23
- **Violates Axiom:** Axiom 2 (SSOT — branded type integrity at system boundary)
- **Locations:**
  - `src/store/usePlcConfigStore.ts` — `PortNumber` / `TimeoutMs` branded types in `PlcConfig` are serialized to localStorage as plain `number` via Zustand `persist`, and deserialized without passing through `asPortNumber()` / `asTimeoutMs()` constructors
  - `src/store/useSignalConfigStore.ts` — `PlcRawValue` branded types (`HH/H/L/LL`) in `SignalConfig` are persisted to localStorage and rehydrated without passing through `asThresholdValue()` constructor (ADR-010 Phase 1, 2026-05-24)
- **Pattern:** Zustand `persist` calls `JSON.parse` on rehydration and assigns fields directly to the typed state. TypeScript believes the rehydrated values are branded types, but at runtime they are plain `number`. This bypasses the validation enforced by constructor functions and violates Domain Layer Contract 2 ("Directly assigning a `number` to a branded type variable"). The practical risk is low because values are validated on write, but the compile-time guarantee is silently broken after each app restart.
- **Count:** 2 / 3
- **Status:** Monitoring — acceptable risk for now; escalate if pattern spreads further

---

## YC-003: Ribbon/Footer slot duplication and unused dead code

- **Discovered:** 2026-05-24
- **Violates Axiom:** Axiom 3 (Muscle Memory UX — single canonical slot surface)
- **Locations:**
  - `src/components/Ribbon.tsx` — implements 4 slots as horizontal toolbar (contradicts ADR-004 desktop sidebar topology)
  - `src/components/Footer.tsx` — implements 4 slots as footer grid but is **never rendered** in `Dashboard.tsx` (dead code)
- **Pattern:** Two components implement the same 4 fixed-slot concept with overlapping logic but diverging topologies. One component is entirely unused. This creates two competing "sources of truth" for slot behavior and prevents responsive layout from working correctly.
- **Count:** 2 / 3
- **Status:** Resolved — eliminated in ADR-008 (both files deleted; replaced by `FixedControlSlots` with `layout` prop)

---

## Ascended Patterns (Reference)

*None yet.*

---

## Entry Format

```markdown
## YC-NNN: Short description of the pattern

- **Discovered:** YYYY-MM-DD
- **Violates Axiom:** Axiom 1 / Axiom 2 / Axiom 3
- **Locations:**
  - `src/components/Foo.tsx:42`
  - `src/components/Bar.tsx:17`
- **Pattern:** Describe in 1–2 sentences what makes this implementation risky
- **Count:** N / 3
- **Status:** Monitoring / Red card issued / Ascended
```
