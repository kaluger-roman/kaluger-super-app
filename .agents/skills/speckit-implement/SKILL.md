---
name: speckit-implement
description: "Execute an existing Super App feature task plan, keeping tasks and verification evidence current while following local Mac conventions."
---

Read `AGENTS.md`, `.specify/memory/constitution.md`, and the exact target
`specs/<id>-<name>/`. Prefer explicit feature id or `SPECIFY_FEATURE`; strip `codex/`
from a feature branch only when it identifies an existing spec. Numeric prefixes
can repeat, and detached HEAD is not a feature id. Use current local paths.

# Implement the task plan

Require spec/plan/tasks. Read applicable contracts, data model, quickstart and checklists.
Use `SPECIFY_FEATURE=<full-id> bash .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
when useful. Inspect incomplete checklists: fix documentation omissions within scope;
resolve substantive unsettled requirements before dependent implementation. An existing
user decision is sufficient; don't repeat a blanket approval prompt for unchecked boxes.

Check local setup, dependencies and target dev/test databases. Follow task dependencies;
independent tasks may be grouped, but [P] doesn't make conflicting edits safe. Read
package conventions before changing code and test conventions before tests.

Implement each scoped task with appropriate tests and run meaningful checks. Mark
`[x]` only when its actual completion criterion is met; record evidence, partial work
and blocked dependencies. Do not skip tests, silently change requirements, or claim
pending browser scenarios passed. Reconcile spec/plan only for justified decisions.

Finish by reviewing diff, running all affected checks, and executing relevant
quickstart scenarios. Return task completion, evidence and remaining items. No
automatic commit, push, issue creation, news publication or deployment.
