---
name: speckit-plan
description: "Turn an approved or sufficiently clear Super App feature spec into an implementation plan and necessary data, API and verification artifacts."
---

Read `AGENTS.md`, `.specify/memory/constitution.md`, and the exact target
`specs/<id>-<name>/`. Prefer explicit feature id or `SPECIFY_FEATURE`; strip `codex/`
from a feature branch only when it identifies an existing spec. Numeric prefixes
can repeat, and detached HEAD is not a feature id. Use current local paths.

# Plan implementation

Read the spec, relevant code/conventions and `.specify/templates/plan-template.md`.
For a fresh plan only, `SPECIFY_FEATURE=<full-id> bash .specify/scripts/bash/setup-plan.sh --json`
copies the template; do not run it over an existing plan because it overwrites it.
Edit an existing plan in place, preserving established decisions and user changes.

Document actual stack, affected modules, integration points, constraints and a
constitution check. Resolve important unknowns from code or authoritative research;
record decision/rationale/alternatives in `research.md` only where useful.
For changed persistence/API, add `data-model.md` and `contracts/` with fields,
validation, ownership, transitions, migration/backfill and rollback considerations.
For unchanged contracts say so rather than inventing new architecture.

Provide `quickstart.md` with concrete local Mac verification steps using dev-stack
URLs and isolated databases. Recheck the design against requirements/constitution.
Name unresolved decisions instead of silently accepting conflicts. End with a plan
and relevant artifacts; task generation and implementation are separate steps.
Do not regenerate AGENTS.md from feature plans or introduce obsolete Claude tooling.
