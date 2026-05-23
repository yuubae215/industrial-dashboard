# UI Layer Contracts

> Implementations that violate the prohibitions in this document receive a 🟥 Red Card (merge rejection).

Reference: [PHILOSOPHY.md](../../PHILOSOPHY.md) Axiom 3 / [ADR-004](../adr/adr-004-ux-fixed-slot-policy.md)

---

## Contract 1: Fixed-Slot Immutability

**Allowed:**
- Setting a button to a "non-pressable" state via the `disabled` attribute + visual greying
- Switching slot content (label, icon) based on context

**Prohibited:**
- Physically removing a button with `display: none` / `visibility: hidden` ← 🟥
- Swapping slot indices (positions) based on state changes ← 🟥
- Dynamically placing only active buttons left-aligned (sequential layout) ← 🟥
- Auto-shrinking container size based on content amount ← 🟥

---

## Contract 2: Unidirectional Data Flow (Anti-Jitter)

**Allowed:**
- Tauri event → Zustand store update → React component re-render

**Prohibited:**
- A React component receiving a value and caching it in its own `useState` for delta calculation ← 🟥
- Feeding back diffs between previous and current props to the store inside `useEffect` ← 🟥
- Directly mutating the DOM via `ref` to bypass the store ← 🟥

---

## Contract 3: UI Thread Protection

**Allowed:**
- All PLC communication and data transformation via `invoke()` Tauri commands
- Memoizing heavy computations (sort, filter, aggregation) with `useMemo`

**Prohibited:**
- Running `for` loops or synchronous heavy computation directly in event handlers ← 🟥
- Transforming 500+ data items with `Array.map()` directly before every render (without virtualization) ← 🟥

---

## Contract 4: Component Scope

**Allowed:**
- Components handle "display and minimal interaction" only
- Using branded types (`PlcRawValue`, `EngineeringValue`) in component `Props` types

**Prohibited:**
- Writing Tauri `invoke()` directly inside a component (route through a store or custom hook) ← 🟥
- Computing scaling or unit conversion logic inside component render ← 🟥
