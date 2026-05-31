# Custom Command: /doc-maintain — Documentation Maintainer

> **Purpose:** Analyze git changes since the last commit, determine which governance documents
> are out of sync per the co-commit rules in CLAUDE.md, update them to reflect actual code state,
> and check whether active yellow card patterns recurred in the diff.
>
> Run **after** making code changes and **before** committing. This command replaces the
> manual step of remembering which docs need updating.

## When to run

Run `/doc-maintain` in any of these situations:

1. After implementing a feature or bug fix, before `git commit`
2. When `/adr-validate` flags a co-commit rule violation
3. After an ADR is accepted and its implementation consequences need propagating into spec docs
4. When a pre-commit check fails citing documentation-code desync

## Scope boundaries (what this command does NOT do)

- Does not write new ADRs — that is `/adr`'s responsibility
- Does not refactor source code — documentation is the only output
- Does not update `PHILOSOPHY.md` — it is immutable by definition
- Does not modify `docs/adr/*.md` — ADRs are immutable once Accepted
- Does not run if no co-commit triggers fired — outputs "No update required." and stops

---

## Step 1: Capture the diff scope

Run the following to understand what changed:

```bash
git diff HEAD --name-only
git diff HEAD --stat
```

If the working tree is clean (all changes already committed), compare against the prior commit:

```bash
git diff HEAD~1 HEAD --name-only
git diff HEAD~1 HEAD --stat
```

---

## Step 2: Classify changes against co-commit trigger rules

For each file in the change set, apply the table below.
A single file can satisfy multiple triggers simultaneously.

| If the change set includes…                                                  | Trigger              |
|------------------------------------------------------------------------------|----------------------|
| `src/store/*.ts` — field added, removed, or renamed                         | T1: STATE_TRANSITIONS |
| `src/types/domain.ts` — type used by a store changed                        | T1: STATE_TRANSITIONS |
| `ConnectionStatus` enum or its valid transitions modified                    | T1: STATE_TRANSITIONS |
| New `invoke()` call path or new Tauri command registered in `lib.rs`         | T1: STATE_TRANSITIONS |
| New cross-store subscription (`subscribe`, `getState` between stores)        | T1: STATE_TRANSITIONS |
| `src/components/*.tsx` — layout topology or breakpoint behavior changed      | T2: ARCHITECTURE      |
| `src/hooks/useIsMobile.ts` — breakpoint value changed                       | T2: ARCHITECTURE      |
| `src-tauri/src/lib.rs` — command added, removed, or payload shape changed   | T2: ARCHITECTURE      |
| New layer boundary crossing (UI component calls `invoke()` directly)         | T2: ARCHITECTURE      |
| Form Layout Adaptation rules changed (isMobile style morphing)               | T2: ARCHITECTURE      |
| Yellow card pattern found in diff (see Step 4)                               | T3: YELLOW_CARD_COUNT |
| T3 results in a count reaching 3                                             | T4: CONTRACTS + T5: CLAUDE_MD |

If no triggers fire → output "No co-commit documentation update required for this change set." and stop.

---

## Step 3: Read the current state of triggered documents

Before writing anything, read the full content of each triggered document:

- T1 triggers → Read `docs/STATE_TRANSITIONS.md`
- T2 triggers → Read `docs/ARCHITECTURE.md`
- T3/T4/T5 triggers → Read `docs/governance/yellow-cards.md`, the relevant `docs/contracts/*.md`, and `CLAUDE.md`

Also read the changed source files themselves to understand *what* changed, not just *that* something changed.

---

## Step 4: Perform the documentation updates

### T1 — Update `docs/STATE_TRANSITIONS.md`

**Store field changes** (`src/store/*.ts` add/remove/rename):
- §2 "Zustand Store Responsibility Boundaries" — update the SSOT invariant block listing each store's field types
- If a completely new store was added, add a new sub-section describing its responsibility and data flow

**`ConnectionStatus` transition changes**:
- §1 "ConnectionStatus State Machine" — update the ASCII state diagram and the "Prohibited transitions" list

**New `invoke()` path or new store consumer**:
- §2/§3 "Telemetry Data Lifecycle" — update the ASCII data flow diagram with the new call site and the store action it feeds

**Polling interval or connection retry logic changes**:
- §7 "Polling Interval State" — update the `useEffect` code block to match reality
- §6 "Error Recovery Transitions" if retry logic changed

**Alarm lifecycle changes** (new state, new transition):
- §4 "Alarm State Transitions" — update the ASCII diagram

### T2 — Update `docs/ARCHITECTURE.md`

**Layout topology changes** (new component, changed breakpoint):
- §4a "Desktop" or §4b "Mobile" ASCII diagrams — update changed component positions and dimensions
- Update the layout dimensions table (pixel heights, widths, clamping ranges)

**New Zustand store added**:
- §3 "Zustand Store Responsibility Boundaries" table — add the new store as a row

**New Tauri command or changed signature**:
- §2 system topology ASCII diagram — update the Backend box
- §3 "Layer 4" if the new command is in `src-tauri/src/plc/`

**New layer boundary crossing**:
- §4 "Four-Layer Architecture" — update the relevant layer's "Hard constraints" or "Responsibilities"

**Form Layout Adaptation changes**:
- §5 "Form Layout Adaptation" — update the desktop and mobile form ASCII diagrams

### T3 — Update yellow card counts in `docs/governance/yellow-cards.md`

Scan the full diff for each active yellow card pattern:

**YC-001 (useState initializer side effects — Axiom 2 violation):**
- Detect: `useState(() => {` where the initializer body contains `setInterval`, `setTimeout`, a Zustand action call, or `invoke()`
- Distinguish from acceptable lazy init: `useState(() => expression)` with no side effects is fine

**YC-002 (branded type bypass via persist rehydration — Axiom 3 violation):**
- Detect: a new `persist(...)` store wrapper applied to a store holding branded-type fields (`PortNumber`, `TimeoutMs`, `PlcRawValue`, or any threshold values)
- Detect: `as PlcRawValue`, `as PortNumber`, or similar casts outside `src/types/branded.ts`

For each detected recurrence:
1. Add the new location to the `- **Locations:**` list under that YC entry
2. Increment the `**Count:**` field
3. If count reaches 3: change `**Status:**` to `Red card issued — evaluate ascension` and proceed to T4

**New pattern detected** (not yet tracked):
1. Identify which Axiom or ADR it violates
2. Assign next available `YC-NNN` number
3. Add a new entry to `yellow-cards.md` with Count: 1, Status: Active

### T4 — Update `docs/contracts/*.md` on escalation (count = 3)

Determine which layer contract file to update:
- YC-001 pattern → `docs/contracts/ui-layer.md` (Contract 2: Unidirectional Data Flow)
- YC-002 pattern → `docs/contracts/domain-layer.md` (Contract 2: Mandatory Branded Type Usage)
- New patterns → determine by which layer the violation occurs in

Steps:
1. Add a new "Prohibited" bullet point describing the exact escalated pattern
2. Include a ← 🟥 marker consistent with existing contract format
3. Update `docs/governance/yellow-cards.md` entry: set `**Status:**` to `Ascended — see contracts/`

### T5 — Update `CLAUDE.md` "Absolute Prohibitions" section

When a pattern ascends from T4:
1. Locate the "Absolute Prohibitions" section in `CLAUDE.md`
2. Replace the existing placeholder comment `*(Currently, all prohibitions in contracts apply...)*`
   with a concrete bullet point (keep the placeholder text if other bullets are being added alongside it)
3. Format: `- **[Pattern name]:** [one-sentence prohibition statement] ← 🟥 Red Card (see [YC-NNN])`

---

## Step 5: Idempotency check (apply before every write)

- Before adding a location to a yellow card entry, verify it is not already listed
- Before adding a prohibition to a contract file, verify the same pattern language is not already present
- When updating ASCII diagrams: modify only the boxes, arrows, or labels that correspond to changed code — do not redraw entire diagrams from scratch

---

## Step 6: Report what was done

After all updates, output:

```
## /doc-maintain Report — YYYY-MM-DD

### Change Set Analyzed
- Files changed: N
- Triggers fired: [T1, T2, T3...] / none

### Documents Updated
- [x] docs/STATE_TRANSITIONS.md — §N: [what changed]
- [x] docs/ARCHITECTURE.md — §N: [what changed]
- [ ] docs/governance/yellow-cards.md — no recurrence detected

### Yellow Card Status
- YC-001: count unchanged at 2/3 — no recurrence in diff
- YC-002: count unchanged at 2/3 — no recurrence in diff

### 🟥 RED CARD ESCALATION (if any)
- YC-NNN: contracts/ui-layer.md — prohibition added
- CLAUDE.md Absolute Prohibitions — 1 line added

### Outstanding Items (manual action required)
- [e.g., "New store added: /adr workflow required before ARCHITECTURE.md §3 can be fully updated"]
```

---

## Quick Reference: trigger → document → section

| Trigger signal (in diff)                  | Document                    | Section              |
|-------------------------------------------|-----------------------------|----------------------|
| `src/store/*.ts` field add/remove         | STATE_TRANSITIONS.md        | §2 SSOT invariant    |
| `src/store/*.ts` new file                 | STATE_TRANSITIONS.md + ARCHITECTURE.md | §2 + §3 store table |
| `domain.ts` ConnectionStatus change       | STATE_TRANSITIONS.md        | §1 state diagram     |
| New `invoke()` path in hooks              | STATE_TRANSITIONS.md        | §2 data flow         |
| `Dashboard.tsx` layout structure          | ARCHITECTURE.md             | §4a or §4b           |
| `src-tauri/src/lib.rs` command change     | ARCHITECTURE.md             | §2 topology          |
| `useIsMobile.ts` breakpoint change        | ARCHITECTURE.md             | §4 breakpoint note   |
| YC-NNN pattern in new location            | yellow-cards.md             | YC-NNN entry         |
| YC-NNN count reaches 3                    | contracts/*.md + CLAUDE.md  | relevant layer       |

---

## How to maintain this command file itself

| Trigger                                             | Update                                                              |
|-----------------------------------------------------|---------------------------------------------------------------------|
| New co-commit rule added to `CLAUDE.md`             | Add row to Step 2 table + new `### TN —` handler in Step 4         |
| New yellow card pattern escalates to contracts      | Add detection logic to Step 4 T3 section                           |
| New yellow card opened (YC-NNN)                     | Add `**YC-NNN** (description):` detection block to Step 4 T3       |
| Yellow card marked RESOLVED or Ascended             | Remove from Step 4 T3 active patterns list                         |
| Document section numbers change                     | Update all `§N` references in Step 4 and Quick Reference table     |

When `doc-maintain.md` itself is modified, update `docs/DEVELOPMENT.md` §10 in the same commit
(self-referential co-commit rule).
