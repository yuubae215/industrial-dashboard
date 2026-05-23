# ADR-004: UX Fixed-Slot Policy (Muscle Memory UI)

## Status

Accepted (2026-05-23)

## Context

Factory operators interact with the dashboard under the following conditions:

- Wearing gloves, which reduces touch accuracy
- Operating from a distance on large monitors or while holding a tablet
- Needing to act quickly under stress during alarm events

Traditional UIs that dynamically show/hide buttons or use left-aligned layouts based on context force operators to visually search for button positions on every interaction. This creates cognitive load and is a breeding ground for human error.

## Options Considered

| Option | Description | Problem |
|--------|-------------|---------|
| A. Dynamic display (left-aligned) | Only show active buttons, packed left | Button positions shift with state; muscle memory cannot form |
| B. Fixed slots (adopted) | Lock slot positions by role; disabled = greyed out | Empty slots appear, but physical memory can be established |
| C. Floating menu | FAB + expand menu | Requires an expand action; reduces speed during emergencies |

## Decision

**Adopt the fixed-slot policy (Option B).**

Layout rules:

```
┌─────────────────────────────────────┐
│ [Connection Status]    [System Config] │  ← Fixed header row
├─────────────────────────────────────┤
│                                     │
│         Main Content Area           │
│                                     │
├─────────────────────────────────────┤
│ [Slot 0]  [Slot 1]  [Slot 2]  [Slot 3] │  ← Fixed footer row (4 slots)
└─────────────────────────────────────┘
```

Slot roles are permanently fixed (never swap based on state):

| Slot | Role | When Disabled |
|------|------|---------------|
| 0 (leftmost) | Cancel / Back | Greyed out |
| 1 | Context action A | Greyed out |
| 2 | Context action B | Greyed out |
| 3 (rightmost) | Confirm / Execute | Greyed out |

## Rationale

1. **Muscle memory formation:** "Rightmost = confirm" and "leftmost = cancel" become physically ingrained, allowing operation without looking
2. **Zero cognitive load:** Disabled buttons are visually greyed out — "it exists but can't be pressed" is intuitively clear
3. **Accessibility:** Focus positions for screen readers and external input devices (hard keys) can also be fixed

## Implementation Prohibitions

- Never use `display: none` to physically remove a button (use `disabled` attribute + greyed-out styling instead)
- Never swap slot indices based on state changes
- Never allow container size to auto-shrink based on content

## Desktop Layout Adaptation (2026-05-24)

The original fixed-footer layout was designed for tablet portrait orientation.
On desktop PC, the same fixed-slot principle is applied via a **left sidebar vertical column**:

```
┌──────────┬──────────────────────────────┬───────────┐
│ LEFT     │         MAIN CONTENT         │ RIGHT     │
│ SIDEBAR  │                              │ SIDEBAR   │
│ (200px)  │                              │ (300px)   │
│ VIEWS    │  Charts / KPI cards          │ Active    │
│  Overview│                              │ Alarms    │
│  Trends  │                              │           │
│  Alarms  │                              │           │
│ ──────── │                              │           │
│ CONTROL  │                              │           │
│ [Slot 0] │                              │           │
│ [Slot 1] │                              │           │
│ [Slot 2] │                              │           │
│ [Slot 3] │                              │           │
└──────────┴──────────────────────────────┴───────────┘
│ STATUS BAR (28px): MODE | POLLING | TAG COUNT        │
```

Slot roles, indices, and immutability rules are identical to the footer variant.
The footer becomes a slim status bar (mode indicator, polling info) with no control functions.

## Consequences

- Combined with ADR-005 (SSOT): button `disabled` state is computed via getters derived from SSOT
- For tablet portrait orientation, the footer sticky layout remains valid
- For desktop, slots are in the left sidebar vertical column (same invariance rules apply)

## Related ADRs

- [PHILOSOPHY.md](../../PHILOSOPHY.md) — Axiom 3 (Muscle Memory UX)
- [ADR-005](./adr-005-ssot-state-management.md) — SSOT state management
- [docs/contracts/ui-layer.md](../contracts/ui-layer.md) — UI layer contracts
