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
