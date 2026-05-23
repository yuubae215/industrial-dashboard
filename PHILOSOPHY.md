# Architectural Philosophy — industrial-dashboard

> All architecture decisions, code reviews, and AI-generated code treat the axioms in this document as the supreme authority.

---

## The Three Axioms

### Axiom 1: Orthogonal Separation of Operator Intent and Physical Protocol

The operator's intent ("read D1000 every 500ms") and the physical computation ("assemble a 3E frame, send as binary, parse the response") **must never coexist in the same function or module.**

- The semantics layer (what / when / why) is expressed in domain types in the `src/` frontend
- The protocol layer (which byte sequence) is handled as a pure converter in `src-tauri/src/plc/`
- The only contact point between the two is the Tauri Command (`lib.rs`); semantic decisions must not be written here

### Axiom 2: SSOT — State is Parameters Only, Display is Always Forward-Calculated

The raw values read from the PLC (`PlcRawValue`) are the single source of truth (SSOT).
**Direct mutation of display values via delta calculation is prohibited.**

```
PLC raw value (SSOT)  →  transform function (scaling, unit conversion)  →  display value
     ↑                                                                         ↓
  overwrite prohibited                                                   read-only
```

Accumulating deltas causes floating-point errors to self-amplify, eventually corrupting state.
State must always be forward-calculated from "origin parameters" every time.

### Axiom 3: Muscle Memory UX — Fixed Slots & UI Thread Protection

Factory operators navigate the dashboard while wearing gloves, without staring at the screen.
**The physical positions of buttons and status displays must not move due to state changes.**

- Fixed-slot principle: container size and position remain invariant regardless of display content changes
- UI thread protection: PLC communication and data transformation are handled by Tauri commands (Rust / separate thread); never stall the main thread even for 1ms
- Anti-jitter: never bake input values directly into the view; commit domain state first, then synchronize unidirectionally

---

## Code Governance: Yellow/Red Card System and the Evolutionary Rule Cycle

> **Note: This is not a runtime UI alert. This is a development process rule for autonomously governing code quality by both AI and humans.**

Code governance in this repository (shared by AI and humans) evolves autonomously through cumulative incrementing of violation pattern counts.

### 🟨 Yellow Card (Design Debt Warning)

**Definition:** An "at-risk implementation pattern" that threatens the Three Axioms but is not yet recorded in the constitution (`docs/contracts/`).

Examples (these qualify as yellow cards):
- Arithmetic manipulation of PLC raw values inside a UI component with `setState`
- Writing polling interval decision logic inside `mitsubishi.rs`
- Caching Tauri command return values on the UI side and computing deltas in the next frame

**Process:** Each time the same antipattern recurs in a different part of the repository, increment the violation count and recommend refactoring.

### 🟥 Red Card (Merge Rejection)

**Definition:** An implementation explicitly prohibited in the constitution (`docs/contracts/`), or the **same yellow pattern accumulated more than 3 times**.

**Process:** Block in code review, CI, and AI review.

### 👑 Ascension to Philosophy (Autonomous Governance Cycle)

Frequently-occurring antipatterns that have been red-carded:

1. Add a "prohibition clause" to the relevant layer file in `docs/contracts/`
2. Incorporate into the "Absolute Prohibitions" section of `CLAUDE.md`
3. AI (Claude) and CI will then automatically reject them statically

```
Yellow card → recurs elsewhere (×3) → Red card
        ↓
  Add prohibition clause to docs/contracts/
        ↓
  Ascend to CLAUDE.md Absolute Prohibitions
        ↓
  AI and CI automatically block (permanent)
```

---

## Meta Topology

```
       👑【 PHILOSOPHY.md (this document) 】 ─── All axioms (supreme authority)
                    ↓
       📝【  docs/adr/  】 ─────────────────── Governance constitution embodying axioms (ADR-001–)
                    ↓
       📋【 docs/contracts/ 】 ──────────────── Per-layer "inviolable contracts"
                    ↓
       🔒【 src/types/branded.ts 】 ──────────── Compile-time context isolation
                    ↓
【UI layer / Domain layer / Protocol layer / Async infra layer】 ─── Entities following contracts
```

---

## Related Documents

- [ADR-001](./docs/adr/adr-001-framework.md) — Framework selection
- [ADR-004](./docs/adr/adr-004-ux-fixed-slot-policy.md) — UX fixed-slot policy
- [ADR-005](./docs/adr/adr-005-ssot-state-management.md) — SSOT state management strategy
- [ADR-006](./docs/adr/adr-006-yellow-red-card-governance.md) — Yellow/Red card governance
- [ADR-007](./docs/adr/adr-007-branded-types.md) — Branded type strategy
- [docs/contracts/](./docs/contracts/) — Per-layer contracts
