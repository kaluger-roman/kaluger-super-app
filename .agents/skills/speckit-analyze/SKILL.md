---
name: speckit-analyze
description: "Read-only consistency and coverage analysis across a Super App feature specification, plan, tasks and constitution."
---

Read `AGENTS.md`, `.specify/memory/constitution.md`, and the exact target
`specs/<id>-<name>/`. Prefer explicit feature id or `SPECIFY_FEATURE`; strip `codex/`
from a feature branch only when it identifies an existing spec. Numeric prefixes
can repeat, and detached HEAD is not a feature id. Use current local paths.

# Analyze specification artifacts

Require `spec.md`, `plan.md` and `tasks.md`; report missing prerequisites rather than
creating them. Build maps of requirements, user stories, tasks and explicit constraints.
Check duplication, ambiguity, underspecification, inconsistent terminology/contracts,
constitution conflicts, missing tasks/tests, and tasks without a requirement.

Return findings with stable IDs, severity, file/line, evidence and recommended repair.
Include requirement-to-task coverage, uncovered requirements, unmapped tasks and
counts derived from the actual artifacts. Treat unjustified constitution conflicts
as critical; do not quietly dilute the principle to make the report green.
Prioritize actionable discrepancies over paraphrasing all documents.

This mode is read-only: do not edit files, generate tasks, create issues or begin
implementation. A separate remediation request authorizes those changes. Clearly
state limits and any decisions that require user input.
