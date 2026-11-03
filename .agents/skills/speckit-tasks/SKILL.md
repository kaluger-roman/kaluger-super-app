---
name: speckit-tasks
description: "Generate dependency-ordered implementation tasks for a Super App feature from its specification, plan and contracts."
---

Read `AGENTS.md`, `.specify/memory/constitution.md`, and the exact target
`specs/<id>-<name>/`. Prefer explicit feature id or `SPECIFY_FEATURE`; strip `codex/`
from a feature branch only when it identifies an existing spec. Numeric prefixes
can repeat, and detached HEAD is not a feature id. Use current local paths.

# Break a feature into tasks

Require `spec.md` and `plan.md`; read existing `tasks.md`, contracts, data model and
quickstart when relevant. Use `.specify/templates/tasks-template.md`, adapted to
actual scope. Preserve completed work and stable task IDs on updates.

Organize setup/foundations, prioritized user stories, integration and verification.
Each task is actionable, has a concrete file/location and an observable completion
criterion. Use the existing form `- [ ] T001 [P] [US1] Description with path`;
`[USn]` applies to story tasks, `[P]` only to truly independent work with no shared
file/dependency conflict. Describe dependencies, critical path and useful MVP slice.

Include meaningful regression/behavior tests, migrations and local verification
where needed; do not defer them to a vague polish phase. Map each requirement to
implementation and verification. Avoid invented tasks for unchanged components.
Mark tasks complete only from observed implementation/checks, never as planning.
Write `tasks.md`, summarize phases/dependencies and stop without coding or filing issues.
