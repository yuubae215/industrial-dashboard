# Custom Command: /adr — ADR Creation Workflow

> **Purpose:** Guide Claude Code through creating an Architecture Decision Record before any
> implementation that alters layout topology, slot role assignments, layer boundaries, or
> component lifecycle contracts.

## When an ADR is required

An ADR **must** be written and committed before touching implementation files when:

1. The layout topology changes (e.g., adding a sidebar, changing footer behavior, responsive breakpoints)
2. The 4 fixed-slot role assignments change (Slot 0–3 as defined in ADR-008)
3. A new component crosses a layer boundary (UI → Domain, Domain → Protocol, etc.)
4. A Zustand store is added, renamed, or restructured
5. A Tauri command is added, removed, or its payload shape changes
6. A pattern from `yellow-cards.md` accumulates a third occurrence (red card threshold)

## ADR file naming

```
docs/adr/adr-NNN-short-kebab-description.md
```

Use the next available sequential number. Check `docs/adr/` for existing files.

## Required ADR structure

```markdown
# ADR-NNN: Title

## Status
Proposed | Accepted | Superseded by ADR-XXX (YYYY-MM-DD)

## Context
Why is this change needed? What existing code or documentation forces this decision?
Reference specific file paths and line numbers where the debt or conflict was found.

## Options Considered
| Option | Description | Problem |
|--------|-------------|---------|
| A. … | … | … |
| B. … (adopted) | … | None |

## Decision
State the adopted option and the exact rule it establishes.
Include ASCII topology diagrams for layout changes.

## Implementation Prohibitions
Bullet list of what is explicitly forbidden by this decision.
Must include at least one concrete `display: none` / cast / pattern prohibition if applicable.

## Yellow Card Resolution (if applicable)
Which YC-NNN entry does this resolve?

## Consequences
How does this change the codebase structure? What must be updated?

## Related ADRs
Cross-links to PHILOSOPHY.md, contracts, and dependent ADRs.
```

## Commit discipline

1. `git add docs/adr/adr-NNN-*.md docs/governance/yellow-cards.md`
2. Commit with message: `docs(adr): add ADR-NNN <short description>`
3. Only then proceed to implementation files

**Never commit ADR and implementation changes in the same commit.**
