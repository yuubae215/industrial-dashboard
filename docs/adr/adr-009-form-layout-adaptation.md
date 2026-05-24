# ADR-009: Form Layout Adaptation (Desktop IDE ↔ Mobile Glove)

**Status:** Accepted  
**Date:** 2026-05-24  
**Supersedes:** Portions of ADR-008 §3 (responsive layout)

---

## Context

The industrial dashboard serves two radically different operator contexts:

1. **Desktop (≥ 768px) — IDE Muscle Memory**  
   Engineers use the dashboard like GX Works or a PLC IDE. Screen real estate is high.
   Form fields are navigated with keyboard tab-index chains. Compact horizontal grids
   maximize visible parameters per scroll. A GX Works-style menu bar anchors spatial memory.

2. **Mobile (< 768px) — Industrial Glove Operation**  
   Site operators on tablets use the dashboard while wearing work gloves.
   Touch targets below 44px are physically unreachable. Horizontal grids that require
   precision tapping are operationally dangerous. Forms must stack vertically and present
   the primary action (Save) above Cancel to avoid unnecessary thumb stretch.

ADR-008 defined the 768px breakpoint and the mobile footer grid. It did not specify
how dialogs and parameter forms should adapt across that breakpoint, leading to a risk
of ad-hoc implementations diverging from each other.

---

## Decision

### 1. Single Component — Style Token Morphing

All form dialogs (starting with `ConnectionSettings`) accept an `isMobile: boolean` prop
and morph their layout through style properties. No separate mobile/desktop component
variants are created.

```
ConnectionSettings
  props: { plcs, isMobile, onClose }
  internal layout: determined entirely by isMobile
```

This applies to all future parameter dialogs. The pattern is **style morphing, not component
switching**.

### 2. Desktop Form Layout

- Dialog: centered, `width: 520px`, `borderRadius: 8px`
- Form rows: `display: grid; gridTemplateColumns: '1fr 110px 130px'`  
  (Host wide | Port 110px | Timeout 130px — mirrors GX Works parameter form)
- Inputs: `padding: 8px 10px; fontSize: 13px`
- Buttons: `flex-direction: row`, Cancel left, Save & Apply right
- Tab order: Host → Port → Timeout → (next PLC block) → Cancel → Save

### 3. Mobile Form Layout

- Dialog: bottom-sheet, `width: 100%; borderRadius: '12px 12px 0 0'`
- Form rows: `display: flex; flex-direction: column`
- Inputs: `minHeight: 44px; height: 44px; fontSize: 16px`  
  (44px is the minimum touch target for industrial work gloves per ISO 9241-11)
- Buttons: `flex-direction: column`, Save & Apply first (`order: 1`), Cancel second (`order: 2`)
- `maxHeight: 90vh; overflowY: auto` to handle longer forms without cutting off buttons

### 4. MenuBar — Desktop Only, Conditional Mount

The GX Works-style `MenuBar` component (28px, IDE-style menu items, compact PLC status dots)
is rendered only on desktop via `{!isMobile && <MenuBar />}`. This is acceptable because
the MenuBar has no mobile representation — it is not hidden, it simply does not exist in
the mobile layout. This is different from the prohibited `display: none` pattern.

The MenuBar takes over PLC connection status display from the header on desktop, allowing
the header to show only: title | alarm chip | clock.

### 5. Absolute Prohibition

The following patterns are 🟥 Red Cards in any form dialog or layout component:

```tsx
// 🟥 Red Card — DOM duplication via conditional component mount
{isMobile ? <MobileForm /> : <DesktopForm />}

// 🟥 Red Card — visibility hiding
<DesktopForm style={{ display: isMobile ? 'none' : 'block' }} />
<MobileForm style={{ display: isMobile ? 'block' : 'none' }} />

// 🟥 Red Card — mobile input below 44px floor
<input style={{ height: 32 }} />  // in mobile mode
```

---

## Consequences

**Positive:**
- Single component to maintain; breakpoint change requires only style token update
- Axiom 3 (fixed-slot, anti-jitter) is satisfied: component position/size is invariant
  within a given viewport; transitions happen only on resize crossing 768px
- IDE operators retain keyboard muscle memory; glove operators retain safe touch targets
- ADR-008 slot invariance is extended naturally to dialog forms

**Negative:**
- Components accumulate `isMobile`-conditional style logic; must be kept in named
  style objects (not inline ternaries in JSX), or complexity grows
- Any new dialog component must explicitly receive and thread `isMobile` from Dashboard

**Neutral:**
- `useIsMobile` remains a hook-level concern (not Zustand) per ADR-008

---

## Related

| Document | Relevance |
|---|---|
| [ADR-004](./adr-004-ux-fixed-slot-policy.md) | Fixed-slot invariance principle |
| [ADR-008](./adr-008-mobile-layout-and-slot-refinement.md) | 768px breakpoint, mobile footer grid |
| [docs/ARCHITECTURE.md §4–§5](../ARCHITECTURE.md) | Layout topology diagrams |
| [docs/DEVELOPMENT.md §4–§5](../DEVELOPMENT.md) | IDE muscle memory + mobile anti-patterns |
| [docs/STATE_TRANSITIONS.md §8](../STATE_TRANSITIONS.md) | Responsive transformation flow |
