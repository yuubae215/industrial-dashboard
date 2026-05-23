# ADR-006: Yellow/Red Card Governance System

## Status

Accepted (2026-05-23)

## Context

> **This is not a runtime UI alert specification.**
> **This is a "development process rule" for AI and humans to autonomously govern code quality.**

In complex frontend applications, implementation patterns that violate the design philosophy (PHILOSOPHY.md) axioms gradually creep in. Once an antipattern is introduced, other developers (or AI) reference it as "existing code" and replicate the same pattern elsewhere, causing exponential proliferation.

Ad-hoc countermeasures like "point it out in code review each time" have limits. We need a mechanism that, the moment an antipattern's frequency crosses a threshold, automatically elevates it from "individual review target" to "shared system prohibition (law)."

## Decision

Adopt the following 3-stage governance cycle.

### 🟨 Yellow Card (Design Debt Warning)

**Trigger:** An implementation pattern that threatens the Three Axioms but is not yet listed in the contracts (`docs/contracts/`).

**Issuer:** Code reviewer (human / AI)

**Process:**
1. Record the pattern in a PR comment or `docs/governance/yellow-cards.md`
2. Increment the count each time the same pattern is found elsewhere
3. When count ≥ 3, begin evaluation for red card escalation

**Yellow card examples (industrial-dashboard specific):**
- Writing polling interval or retry logic inside `mitsubishi.rs` or `keyence.rs` (mixing semantics into the protocol layer)
- Adding delta from the previous `useState` value to a new PLC value inside a React component (mixing delta calculation)
- Passing raw IP address strings to Tauri command arguments without validation (unused branded types)

### 🟥 Red Card (Merge Rejection)

**Trigger:**
1. Violation of a prohibition explicitly stated in `docs/contracts/`, or
2. Cumulative yellow card count for the same pattern exceeds 3

**Issuer:** Code reviewer (human / AI). Automated CI rejection is preferred.

**Process:** Block the merge and require refactoring of the violating code.

### 👑 Ascension to Philosophy (Autonomous Governance Cycle)

**Trigger:** A frequently-occurring antipattern is confirmed as a red card.

**Steps:**

```
Step 1: Add a prohibition clause to docs/contracts/<relevant-layer>.md
Step 2: Add one line to the "Absolute Prohibitions" section of CLAUDE.md
Step 3: Remove the entry from docs/governance/yellow-cards.md,
        mark as "ascended to contracts"
Step 4: Refactor existing code to eradicate the antipattern
```

```
Yellow card → recurs elsewhere (×3) → Red card confirmed
        ↓
  Add prohibition clause to docs/contracts/ (constitutional amendment)
        ↓
  Ascend to CLAUDE.md "Absolute Prohibitions" (permanently embedded in AI behavior)
        ↓
  CI and AI automatically block (guardrail established)
```

## Governance Record File

Manage `docs/governance/yellow-cards.md`. Format:

```markdown
## YC-001: Semantics mixed into protocol layer

- **Discovered:** YYYY-MM-DD
- **Location:** src-tauri/src/plc/mitsubishi.rs:42
- **Pattern:** Polling interval conditional branch exists inside protocol implementation
- **Count:** 1 / 3
- **Status:** Monitoring
```

## Rationale

1. **Block exponential proliferation:** Antipatterns become rules rather than individual corrections, preventing recurrence
2. **Alignment with AI autonomous governance:** Adding prohibitions to CLAUDE.md prevents the Coding Agent from generating the same patterns in future sessions
3. **Evolutionary law:** Project-specific antipatterns cannot be fully predicted in advance. A mechanism that learns from actual violations and evolves the constitution is necessary

## Consequences

- Create `docs/governance/` directory (initial file: `yellow-cards.md`)
- Adding yellow card checklist items to the PR template is recommended

## Related ADRs

- [PHILOSOPHY.md](../../PHILOSOPHY.md) — Code governance axioms
- [docs/contracts/](../contracts/) — All layer prohibitions
