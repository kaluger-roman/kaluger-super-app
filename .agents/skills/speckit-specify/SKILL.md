---
name: speckit-specify
description: "Create or update a Super App feature specification from a natural-language requirement, preserving the existing Spec Kit artifact format."
---

Read `AGENTS.md`, `.specify/memory/constitution.md`, and the exact target
`specs/<id>-<name>/`. Prefer explicit feature id or `SPECIFY_FEATURE`; strip `codex/`
from a feature branch only when it identifies an existing spec. Numeric prefixes
can repeat, and detached HEAD is not a feature id. Use current local paths.

# Specify a feature

Use `.specify/templates/spec-template.md`. Reuse an existing matching feature before
creating another. For a new feature inspect specs and local/remote branches to choose
an unused global numeric id; explicitly name the full folder, not just a prefix.

If a new branch is needed and the checkout is appropriate, the existing helper is:
`bash .specify/scripts/bash/create-new-feature.sh --json --short-name NAME 'description'`.
It creates and switches to `codex/NNN-name`; run it once, inspect its output, and do
not call it inside an already-assigned feature branch just to generate documentation.
In that case create/copy the spec template into the selected folder directly.

Capture actors, scope/non-goals, prioritized user stories, acceptance scenarios,
edge cases, testable functional requirements, key entities and measurable outcomes.
Keep success criteria independent of implementation choices. Record reasonable
assumptions; ask only high-impact unresolved choices (at most three at a time).
Do not invent answers or turn the spec into a technical implementation plan.

Write `spec.md` and `checklists/requirements.md`; validate clarity, testability,
completeness and consistency. Preserve prior content unrelated to this change.
Return paths and unresolved decisions. No automatic PR/push or implementation.
