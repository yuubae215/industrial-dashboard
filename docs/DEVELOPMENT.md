# Development Handbook

> This document governs development workflow, mock server usage, and UI guardrails.
> All guardrails here are derived from PHILOSOPHY.md and the layer contracts in `docs/contracts/`.

---

## 1. Environment Setup

### Linux System Dependencies (required for Rust build)

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev
pkg-config --exists webkit2gtk-4.1 && echo "OK"
```

Without these, `cargo check` fails on `gdk-sys`.

### Node.js Dependencies

Always run `pnpm install` first in a fresh environment. Missing `node_modules` causes `tsc` to
fail with hundreds of "Cannot find module 'react'" errors unrelated to the actual code under review.

---

## 2. Development Commands

```bash
# Install frontend dependencies (required before every build)
pnpm install

# TypeScript type check — detects branded type misuse at compile time
pnpm build

# Rust backend compile check
cd src-tauri && cargo check

# Start dev server (first run compiles Rust; takes several minutes)
pnpm tauri dev
```

---

## 3. Mock / Stub Layer

Hardware PLCs and mTLS-authenticated API servers are not available in development environments.
The mock shim at `src/mocks/tauri-core.ts` intercepts `invoke()` calls and returns static or
randomized fixture data, keeping production code free of `if (isDev)` branches.

Import resolution is controlled by Vite aliases in `vite.config.ts`:
- In development: `@tauri-apps/api/core` resolves to `src/mocks/tauri-core.ts`
- In production (Tauri binary): the real Tauri runtime is used

When adding a new Tauri command, register a corresponding stub in `src/mocks/tauri-core.ts`
before writing any frontend code that calls it.

---

## 4. IDE Muscle Memory — Desktop Layout Implementation

When developing or altering desktop layouts, emulate the UX flow of GX Works and similar
engineering IDE tools. Operators navigate from muscle memory; unexpected visual changes
break the physical habit loop.

### MenuBar (GX Works style)

- Fixed height **28px**, `background: '#07080E'` (darker than `bgHeader`)
- Menu items: transparent background, `fontSize: xs`, zero border-radius, no padding-y
- Hover state via `onMouseEnter`/`onMouseLeave` — not CSS `:hover` (inline-style constraint)
- PLC status in MenuBar: compact dot (5×5px) + label — full badges belong in header only
- Never add icons, gradients, or rounded corners to the MenuBar

### Connection Form (desktop)

- `gridTemplateColumns: '1fr 110px 130px'` — Host wide, Port narrow, Timeout narrow
- Inputs: `padding: 8px 10px`, `fontSize: 13px`, `fontFamily: JetBrains Mono`
- Tab order must follow left-to-right across the grid row, then next PLC block
- Dialog anchors **center-center** (no sheet-from-bottom on desktop)

### Keyboard Navigation Invariant

Forms inside setup dialogs must maintain a linear `tabIndex` sequence so field-to-field
navigation works without a mouse. Logical order: Host → Port → Timeout → (next PLC block) → Save.

---

## 5. Prohibited Mobile Modification Anti-Patterns (🟥 Red Cards)

### Anti-pattern 1: Visibility toggling via CSS or conditional mount

```tsx
// 🟥 PROHIBITED — creates DOM duplication or hides elements
{isMobile ? <MobileConnectionSettings /> : <DesktopConnectionSettings />}
<div style={{ display: isMobile ? 'none' : 'block' }}>...</div>

// ✅ REQUIRED — same component, style tokens morph the layout
<ConnectionSettings isMobile={isMobile} ... />
```

### Anti-pattern 2: Squishing form inputs below 44px on mobile

```tsx
// 🟥 PROHIBITED — touch targets below 44px are unreachable through work gloves
<input style={{ height: 32 }} />

// ✅ REQUIRED — 44px floor on every interactive element in mobile mode
<input style={{ minHeight: 44, height: 44 }} />
```

### Anti-pattern 3: Desktop-only slot fixed widths applied to mobile

`ConnectionSettings` width on mobile must be `100%` with `borderRadius: '12px 12px 0 0'`
(bottom-sheet pattern). A fixed `width: 520px` dialog on a narrow viewport is a 🟥 Red Card.

### Anti-pattern 4: Primary action last (natural DOM order) on mobile

On mobile, the primary action button (Save & Apply) is placed **above** Cancel using CSS `order`.
This prevents thumb stretch to reach the bottom of a tall form. Never force the user to
scroll past all fields to find the primary action.

---

## 6. Recharts Safety Guardrails

Violations of these rules cause the application to freeze the UI thread via an infinite
resize recalculation loop (browser compositor deadlock). These rules are mandatory.

### Rule 1: Parent container must declare explicit dimensions

`<ResponsiveContainer>` must never be placed inside an unconstrained Flexbox or Grid cell.
The immediate parent wrapper **must** declare:
- `minWidth: 0` (or `width: "100%"`) — prevents Flexbox from overriding the shrink behavior
- An explicit pixel height (e.g., `height: "350px"`) — prevents infinite height recalculation

```tsx
// Correct
<div style={{ width: "100%", minWidth: 0, height: "350px" }}>
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={points}>...</LineChart>
  </ResponsiveContainer>
</div>

// Prohibited — parent has no constrained height
<div style={{ display: "flex", flexDirection: "column" }}>
  <ResponsiveContainer width="100%" height="100%">  {/* freeze risk */}
    ...
  </ResponsiveContainer>
</div>
```

### Rule 2: Disable chart animation unconditionally

High-frequency industrial telemetry (500ms intervals) triggers major performance drops when
standard browser animation routines run on every data update.

```tsx
// Required on every Line / Bar / Area node
<Line dataKey="value" isAnimationActive={false} />
```

### Rule 3: Vite bundle chunk configuration must be preserved

Recharts pulls D3.js sub-dependencies that inflate bundle size. The manual chunks configuration
in `vite.config.ts` suppresses build warnings. Do not remove or simplify it without benchmarking
the resulting chunk sizes.

---

## 7. Branded Type Guardrails

TypeScript's structural type system does not prevent mixing `PlcRawValue` and `EngineeringValue`
without branded types. The compile-time safety comes entirely from the nominal tags in
`src/types/branded.ts`.

Rules:
- Always create typed values via constructor functions: `asPlcRawValue()`, `asPortNumber()`, etc.
- Never use `as PlcRawValue` or `as unknown as X` casts — these are 🟥 Red Cards
- After Zustand `persist` rehydration, `PlcConfig` branded fields (`PortNumber`, `TimeoutMs`) are
  plain `number` at runtime. This is tracked as YC-002; do not extend this pattern to `PlcRawValue`.

---

## 8. Zustand `persist` Rehydration Boundary

`usePlcConfigStore` uses Zustand `persist` to survive app restarts. Rehydration bypasses
branded type constructors (see YC-002 in `docs/governance/yellow-cards.md`).

Mitigation rule: validate and re-wrap branded fields immediately at the point where rehydrated
`PlcConfig` values are first consumed in a Tauri `invoke()` call. Do not pass raw rehydrated
values further into the domain without reconstruction.

---

## 9. Component Scope Checklist

Before writing a new component, verify:

| Check | Rule |
|---|---|
| Does it call `invoke()` directly? | Route through `usePlcPolling`, `usePlcWrite`, or a store action |
| Does it compute `EngineeringValue` from `PlcRawValue`? | Move computation to a pure selector function |
| Does it use `display: none` on a slot button? | Use `disabled` + CSS opacity instead |
| Does it hold previous PLC values in `useState` for diff? | Use SSOT + forward calculation from the store |
| Does it render a Recharts `ResponsiveContainer`? | Ensure parent has explicit height and `minWidth: 0` |

---

## 10. Code Governance: Yellow/Red Card Workflow

When an at-risk implementation pattern is discovered:

1. Add an entry to `docs/governance/yellow-cards.md` with count = 1
2. Each recurrence in a different location: increment the count
3. Count reaches 3: issue a 🟥 Red Card via PR comment and propose ascension
4. Ascension: add a prohibition clause to the relevant `docs/contracts/` file and to
   the "Absolute Prohibitions" section of `CLAUDE.md`

Full procedure: [ADR-006](./adr/adr-006-yellow-red-card-governance.md)

---

## 11. Documentation Maintainer: `/doc-maintain`

The `/doc-maintain` command automates the co-commit documentation obligations defined in CLAUDE.md.
Run it after making code changes and before committing.

### Development flow

```
1. /adr-validate     — pre-implementation compliance check (existing command)
2. implement changes
3. /doc-maintain     — sync documentation to code (this command)
4. git add src/ docs/ — always commit docs and implementation together
5. git commit
```

### What it does

| Step | Action |
|---|---|
| Diff analysis | Runs `git diff HEAD` and classifies changed files against co-commit trigger rules |
| T1: STATE_TRANSITIONS | Updates `docs/STATE_TRANSITIONS.md` when store fields, state machines, or data flow paths change |
| T2: ARCHITECTURE | Updates `docs/ARCHITECTURE.md` when layer topology, Tauri commands, or layout rules change |
| T3: Yellow card scan | Checks diff for YC-001 and YC-002 patterns; increments counts in `docs/governance/yellow-cards.md` |
| T4: Escalation | When count reaches 3, adds a prohibition to the relevant `docs/contracts/*.md` |
| T5: CLAUDE.md | Adds the escalated pattern to the "Absolute Prohibitions" section of `CLAUDE.md` |
| Report | Outputs a summary of all documents updated and yellow card status |

### PostToolUse sentinel

A PostToolUse hook in `.claude/settings.json` automatically prints a reminder message when
Claude Code edits co-commit-trigger files (`src/store/`, `src/types/domain.ts`,
`src-tauri/src/lib.rs`, `src/components/Dashboard`, `src/hooks/useIsMobile`).
The hook is a **reminder only** — it does not modify any documentation.

### Maintaining the command itself

When adding new co-commit rules to `CLAUDE.md`, update `.claude/commands/doc-maintain.md`
(Step 2 trigger table + Step 4 handler) in the same commit as the CLAUDE.md change.

---

## Related Documents

| Document | Role |
|---|---|
| [PHILOSOPHY.md](../PHILOSOPHY.md) | Supreme authority |
| [docs/ARCHITECTURE.md](./ARCHITECTURE.md) | System topology and layer boundaries |
| [docs/STATE_TRANSITIONS.md](./STATE_TRANSITIONS.md) | State machines and data flow |
| [docs/governance/yellow-cards.md](./governance/yellow-cards.md) | Active yellow card ledger |
| [ADR-004](./adr/adr-004-ux-fixed-slot-policy.md) | Fixed-slot layout specification |
| [ADR-005](./adr/adr-005-ssot-state-management.md) | SSOT state management strategy |
| [ADR-007](./adr/adr-007-branded-types.md) | Branded type strategy |
| [ADR-009](./adr/adr-009-form-layout-adaptation.md) | Form Layout Adaptation |
