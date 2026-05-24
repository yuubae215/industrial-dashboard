# ADR-008: Mobile Layout and Fixed-Slot Refinement

## Status

Accepted (2026-05-24)

## Context

### Design Debt Discovered During Mobile Layout Implementation

When implementing responsive (tablet portrait) support for `Dashboard.tsx`, three pre-existing
implementation gaps were found that contradict ADR-004 (UX Fixed-Slot Policy):

#### Gap 1: `Footer.tsx` is dead code

`Footer.tsx` implements the 4 fixed-slot footer layout (ADR-004 mobile topology) but is never
imported or rendered in `Dashboard.tsx`. The component exists but has no effect.

#### Gap 2: `Ribbon.tsx` contradicts ADR-004 Desktop Layout

ADR-004 Desktop Layout specifies that the 4 fixed slots must appear in the **left sidebar vertical
column** (bottom section). Instead, `Ribbon.tsx` places them in a horizontal toolbar immediately
below the header. This deviates from the document and creates a second operational channel.

#### Gap 3: Slot roles not canonicalized for this application

ADR-004 uses generic names (`Context action A`, `Context action B`, `Confirm / Execute`). The
actual assignments for this application — `Settings`, `Trend`, `Maintenance` — exist only in code
comments with no formal ADR-level definition. If a developer reads ADR-004 alone, the intended
slot behavior is ambiguous.

## Decision

### 1. Canonicalize slot roles for industrial-dashboard

The 4 fixed slots are assigned the following permanent, application-level roles:

| Slot | ADR-004 Generic Role | Application Role | Notes |
|------|----------------------|------------------|-------|
| 0 (leftmost) | Cancel / Back | **BACK** | Reserved; always disabled in v1 |
| 1 | Context action A | **SETTINGS** | Opens `ConnectionSettings` modal |
| 2 | Context action B | **TREND** | Toggles `RealtimeTrendChart` visibility |
| 3 (rightmost) | Confirm / Execute | **MAINTENANCE** | Toggles `isMaintenanceMode` in `useDebugStore` |

`MAINTENANCE` maps to the "Confirm / Execute" category because it commits a persistent operational
state change (entering / exiting maintenance mode) — the highest-weight irreversible action
available in the current feature set.

### 2. Extract `FixedControlSlots` component

Replace both `Ribbon.tsx` and `Footer.tsx` with a single, layout-agnostic `FixedControlSlots`
component. The component accepts a `layout` prop:

- `layout="horizontal"` — 4-column CSS grid (mobile footer)
- `layout="vertical"` — flex-column stack (desktop sidebar bottom)

Slot identities, indices, and disabled logic are **identical in both orientations**. Only the
container geometry changes.

### 3. Remove `Ribbon.tsx` and `Footer.tsx`

Both files are deleted. `FixedControlSlots` covers both use cases.

### 4. Desktop: move control slots to left sidebar bottom (per ADR-004)

`LeftSidebar` gains an optional `footer` prop. `Dashboard.tsx` passes
`<FixedControlSlots layout="vertical" … />` there, which aligns the desktop layout with the
topology diagram in ADR-004:

```
┌──────────┬──────────────────────────────┬───────────┐
│ FIELD    │         MAIN CONTENT         │  ACTIVE   │
│ NETWORK  │                              │  ALARMS   │
│          │  RealtimeTrendChart          │           │
│ MELSEC   │  WatchWindow                 │           │
│ Keyence  │                              │           │
│ ──────── │                              │           │
│ [BACK  ] │                              │           │
│ [SETTING] │                              │           │
│ [TREND ] │                              │           │
│ [MAINT ] │                              │           │
└──────────┴──────────────────────────────┴───────────┘
│ STATUS BAR: MODE | POLLING | TAG COUNT               │
```

### 5. Mobile: footer with 4 horizontal slots (per ADR-004 original topology)

Breakpoint: `window.innerWidth < 768px`. On mobile:

- `LeftSidebar` is not rendered (connection status is visible in the header badges)
- `RightSidebar` is shown as a compact fixed-height (140px) scrollable panel above the footer
- `FixedControlSlots layout="horizontal"` is rendered at the bottom

```
┌─────────────────────────────────────────────────┐
│ INDUSTRIAL DASHBOARD   [MELSEC:…] [KV:…]  HH:MM │
├─────────────────────────────────────────────────┤
│                                                 │
│  RealtimeTrendChart (if visible)                │
│  WatchWindow                                    │
│                                                 │
├─────────────────────────────────────────────────┤
│  ACTIVE ALARMS (140px, scrollable)              │
├─────────────────────────────────────────────────┤
│ [BACK] [SETTINGS] [TREND] [MAINT]               │
└─────────────────────────────────────────────────┘
```

### 6. `useIsMobile` hook

A dedicated hook (`src/hooks/useIsMobile.ts`) encapsulates the `window.innerWidth` listener so
that breakpoint logic is not duplicated or inlined inside components.

## Implementation Prohibitions

Extends the prohibitions in ADR-004. In addition:

- **Never render `FixedControlSlots` in two places simultaneously.** On desktop it lives in the
  sidebar; on mobile it lives in the footer. Exactly one instance is mounted at a time.
- **Never use a separate component for horizontal vs. vertical variants.** The `layout` prop is
  the single axis of variation; do not create `MobileFooter.tsx` or `DesktopControlPanel.tsx`.
- **Never add, remove, or reorder slots based on `isMobile`.** The 4 slots are always present in
  the same order regardless of orientation or viewport.
- **Never put `display: none` on an individual slot.** Disabled state is expressed via the
  `disabled` attribute and greyed-out styling only (inherited from ADR-004).

## Yellow Card Resolution

This ADR resolves the design debt tracked as **YC-003** in `docs/governance/yellow-cards.md`.
The Ribbon/Footer duplication pattern is eliminated by this change.

## Consequences

- `Ribbon.tsx` is deleted; no component in the project uses it after this change
- `Footer.tsx` is deleted; no component in the project uses it after this change
- `LeftSidebar` gains an optional `footer?: React.ReactNode` prop (backward-compatible default: `undefined`)
- `Dashboard.tsx` conditionally renders `LeftSidebar` (desktop only) and routes the `isMobile`
  state to select the correct `FixedControlSlots` placement

## Related ADRs

- [ADR-004](./adr-004-ux-fixed-slot-policy.md) — UX Fixed-Slot Policy (parent)
- [ADR-005](./adr-005-ssot-state-management.md) — SSOT state management (slot disabled state derives from store)
- [docs/governance/yellow-cards.md](../governance/yellow-cards.md) — YC-003
