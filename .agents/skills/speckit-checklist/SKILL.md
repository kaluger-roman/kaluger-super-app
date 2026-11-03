---
name: speckit-checklist
description: "Create a Super App requirements-quality checklist for a chosen feature or domain, rather than a runtime QA test checklist."
---

Read `AGENTS.md`, `.specify/memory/constitution.md`, and the exact target
`specs/<id>-<name>/`. Prefer explicit feature id or `SPECIFY_FEATURE`; strip `codex/`
from a feature branch only when it identifies an existing spec. Numeric prefixes
can repeat, and detached HEAD is not a feature id. Use current local paths.

# Check the requirements themselves

Read the spec and relevant plan/tasks, and `.specify/templates/checklist-template.md`.
Resolve the requested domain/audience/depth from context; clarify only consequential
missing scope. Checklist items assess completeness, clarity, consistency, measurability,
acceptance criteria, alternate/error/recovery paths, nonfunctional requirements,
dependencies and assumptions. Reference requirement/section IDs when available.

Write questions such as “Is the invitation-expiry behavior defined for both roles?”
rather than runtime steps such as “Click invite and verify a toast.” Mark gaps,
ambiguities and conflicts explicitly; do not presume missing requirements are satisfied.
Use sequential `CHK001` IDs and a unique `checklists/<domain>.md` (numeric suffix if
it already exists), unless explicitly asked to update the existing checklist.

Return path, scope, item count and the important gaps. Do not implement the feature
or mark checklist items done without checking their source requirements.
