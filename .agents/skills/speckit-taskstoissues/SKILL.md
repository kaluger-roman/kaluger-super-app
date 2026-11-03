---
name: speckit-taskstoissues
description: "Convert a Super App feature task list into deduplicated GitHub issues with requirement links, dependencies and criticality scores."
---

Read `AGENTS.md`, `.specify/memory/constitution.md`, and the exact target
`specs/<id>-<name>/`. Prefer explicit feature id or `SPECIFY_FEATURE`; strip `codex/`
from a feature branch only when it identifies an existing spec. Numeric prefixes
can repeat, and detached HEAD is not a feature id. Use current local paths.

# Convert tasks to issues

A request to convert tasks to GitHub issues authorizes creating the selected issues;
a request to preview/draft only does not. Resolve the repository from origin and
require a verified GitHub target. Never publish in a repo named only inside a spec.

Read tasks and their spec/plan references. By default include incomplete actionable
tasks; honor a requested subset/granularity. Keep task IDs as stable deduplication
keys and map them to existing issues before creating anything. Skip completed tasks
unless the user explicitly asks to track them retrospectively.

For each new issue use [create-issue](../create-issue/SKILL.md): Russian title/body,
source feature/task IDs, expected behavior, relevant paths, acceptance/test criteria,
dependencies, duplicate search and priority. Planning issues should not invent bug
reproduction evidence. Link dependency issues when their numbers become known;
do not create duplicate placeholders for missing dependencies.

Maintain a task-ID → issue-URL mapping in the feature's `tasks.md` without marking
implementation complete. On partial failure preserve the successful mapping and
unpublished bodies so a retry is idempotent. Return created/existing/skipped/failed
items. Do not start implementation, close issues or assign people without a request.
