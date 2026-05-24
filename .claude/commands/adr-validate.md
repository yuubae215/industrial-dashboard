# Custom Command: /adr-validate — Pre-Implementation Compliance Check

> **Purpose:** Force a structured self-audit against PHILOSOPHY.md and all active ADRs before
> writing or modifying any source file. Run this mentally (or explicitly) at the start of every
> implementation task.

## Step-by-step validation protocol

### 1. Read the governing documents

Before touching any file, confirm you have read:
- `PHILOSOPHY.md` — The Three Axioms (supreme authority)
- `docs/adr/adr-004-ux-fixed-slot-policy.md` — Fixed-slot invariance rules
- `docs/adr/adr-008-mobile-layout-and-slot-refinement.md` — Responsive layout contract
- `docs/contracts/ui-layer.md` — UI layer prohibitions
- `docs/governance/yellow-cards.md` — Active at-risk patterns

### 2. Check for fixed-slot violations

For every file under modification that touches UI layout or control buttons:

- [ ] Are all 4 slots (indices 0–3) always present in the DOM? (no `display: none`, no conditional omission)
- [ ] Are slot indices fixed? (no reordering based on state or viewport)
- [ ] Is `FixedControlSlots` rendered in **exactly one location** at a time?
- [ ] Does the `layout` prop (`'horizontal'` vs `'vertical'`) change only the container geometry, not the slot content?

### 3. Check for layer boundary violations

- [ ] Does any UI component call `invoke()` directly? (must route through hooks or stores)
- [ ] Does any component hold a previous PLC raw value in `useState` for delta calculation? (Axiom 2 violation)
- [ ] Does any file outside `src/types/branded.ts` use `as PlcRawValue` or similar forced casts? (Axiom 3 violation)

### 4. Check for documentation-code desync

- [ ] Does the change alter slot roles, layout topology, or store shape in a way not covered by an existing ADR?
  - **YES →** HALT. Run `/adr` workflow to write a new ADR first.
  - **NO →** Continue.

### 5. Check yellow-card patterns

For each entry in `docs/governance/yellow-cards.md`:
- [ ] Does the proposed change introduce the same at-risk pattern in a new location?
  - **YES →** Update the entry's `locations` and `count`. If `count` reaches 3, issue red card.

## Report format when a violation is found

```
🟨 YELLOW CARD RISK: [YC-NNN or new pattern]
File: src/components/Foo.tsx:42
Violation: [describe what the code does that breaks the axiom/ADR]
Required fix: [state the corrective action]
ADR needed: YES / NO
```

Do not proceed with implementation until all checklist items pass.
