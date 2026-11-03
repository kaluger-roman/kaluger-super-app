---
name: auto-bug-fix
description: "Diagnose and fix a Super App bug or issue end to end with a regression test, local review, relevant QA and resumable progress."
---

# End-to-end bug fix

Read `AGENTS.md`, applicable conventions and the reported issue/evidence. Inputs:
description/issue, `--new`, `--resume SLUG`, optional `--checkpoints`. Reuse the current
local checkout/worktree; do not create nested worktrees or an empty startup PR.

1. Reproduce or trace the exact failure, determine root cause, impacted paths and
   the smallest fix. Distinguish observed from inferred behavior. Under explicit
   --checkpoints, present this concrete diagnosis/plan before modifying code; otherwise
   proceed within the authorized fix scope and clarify only material ambiguity.
2. Add a regression test that fails for the broken behavior, then fix it following
   conventions. Avoid unrelated cleanup or masking the symptom.
3. Run targeted tests and affected lint/types; use the isolated test DB for backend.
4. Use [code-review-local](../code-review-local/SKILL.md); fix confirmed relevant
   findings. Bound review to three passes, stopping early on convergence.
5. For user-visible bugs use [manual-qa](../manual-qa/SKILL.md) to repeat original
   reproduction and adjacent cases, up to three passes with recorded rechecks.
   For tooling bugs verify the actual tool behavior rather than unrelated browser QA.
6. Update [changelog](../changelog/SKILL.md). Follow the requested Git/PR delivery
   scope and check CI if published. No automatic news, ready, merge or deploy.

For long/resumable fixes keep a compact `docs/bug-reports/<slug>-progress.md` with
root cause, reproduction, changed files, checks, report links, open findings and next
step. Read it and current diff on resume. No full feature-spec/mockup pipeline is
required. Finish with root cause, result, verification, limitations and actual Git state.

## Delegated phases

Use `docs/subagents.md`. Delegate diagnosis/root cause to an investigation worker,
then the scoped fix/regression test to an implementation worker after validating
the diagnosis. Give each the relevant evidence and conventions, with maximum
supported reasoning effort. Delegate browser QA separately when relevant; QA need
not use max effort. The parent directly dispatches the nine code-review roles and
independent scorers rather than nesting an idle review orchestrator. Review/QA
workers do not fix; the parent validates and repairs their confirmed findings.
Keep dependent stages ordered, independent checks concurrent within the slot limit,
and progress resumable. Workers do not recursively invoke auto-bug-fix or publish.
