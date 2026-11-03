---
name: auto-feature
description: "Implement a substantial Super App feature end to end with resumable specs, optional mockups, tests, code review and browser QA."
---

# End-to-end feature delivery

Read `AGENTS.md` and `docs/codex-workflow.md`. Inputs: feature description/issue,
`--new`, `--resume SLUG`, optional `--checkpoints`. Reuse the current local checkout
or assigned Codex worktree. Do not nest a worktree or create an empty commit/PR.

Persist progress in `specs/<feature>/tasks.md` and `plan.md`: phase, decisions,
artifacts, user choices, tests, review/QA findings, pending scenarios and next step.
On resume read that state and current diff; confirm completed work from evidence,
not a past status flag. If several candidates exist, resolve the target before editing.

1. Scope and spec: use [speckit-specify](../speckit-specify/SKILL.md), then clarify
   important ambiguities. For explicit `--checkpoints`, pause after a concrete spec
   for the user's review; otherwise reuse settled choices and ask only material questions.
2. UI when applicable: create reviewable mockups using the current design system and
   save them in `docs/mockups/<feature>/`, with local screenshots. With --checkpoints,
   present them before implementation. Skip mockups for backend-only work.
3. Plan and tasks: use [speckit-plan](../speckit-plan/SKILL.md) and
   [speckit-tasks](../speckit-tasks/SKILL.md); maintain scope, contracts and dependency order.
4. Implement via [speckit-implement](../speckit-implement/SKILL.md). Keep working-tree
   changes reviewable until review/QA are complete; run relevant checks.
5. Review with [code-review-local](../code-review-local/SKILL.md). Fix confirmed
   in-scope findings and rerun impacted checks. Bound to five review passes unless
   the user chooses another limit; stop earlier when clean/converged and report any remainder.
6. For affected UI, [manual-qa](../manual-qa/SKILL.md), up to three passes: new
   scenarios plus exact rechecks, never repeating already-covered cases without cause.
   Record uncovered/blocked scenarios; no new findings is not proof of full coverage.
7. Update [changelog](../changelog/SKILL.md). Commit/push/PR and CI only within the
   user's delivery request; do not automatically publish news, mark ready, merge or deploy.

Finish with delivered behavior, spec/report links, checks, remaining decisions and
actual Git/PR status. Report incomplete work honestly. Small fixes do not need this
pipeline; do not activate it merely because a task touches frontend and backend.

## Delegated phases

Use `docs/subagents.md`. The parent orchestrates progress and separately delegates
specification, UI mockups when applicable, clarify→plan→tasks, implementation, and
browser QA to specialized workers with the relevant skill/conventions. These phases
remain dependency-ordered; independent research/implementation scopes may run in
parallel when they do not edit the same files. Analysis/coding workers use maximum
supported reasoning effort; browser QA need not. Dispatch the nine code-review roles
and independent scorers directly, without a wrapper agent occupying a waiting slot.
Review/QA workers report only; the parent confirms and fixes in-scope findings.
Do not recursively invoke auto-feature inside a worker or let workers commit/publish.
Verify each phase artifact before advancing; record failures and remaining work.
