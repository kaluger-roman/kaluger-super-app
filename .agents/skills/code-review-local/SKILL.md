---
name: code-review-local
description: "Review Super App branch and uncommitted changes with nine independent subagent perspectives and separate scoring, producing a local JSON report."
---

# Local code review

Read `AGENTS.md` and applicable conventions. Inputs: optional `--worktree PATH`,
`--base-ref REF` (default verified origin/main or main), `--threshold N` (default 50),
`--iter N`, `--feature SLUG`, `--silent`. Validate numbers and restrict report slugs
to a safe local filename. This is review, not authorization to fix/publish.

Collect the committed diff from merge-base to HEAD, the tracked working-tree diff
and relevant untracked files. Include fixes made after the last commit even when
committed changes exist. Never use `git add -N`/`reset` to collect evidence: the user's
index must remain intact. Exclude generated files/secrets, not relevant source logic.

Review actual call paths for logic, missing/deleted behavior, type/contract mismatch,
auth/tenant isolation, money/time correctness, races, leaked state, stale wrappers,
false-positive tests and explicit convention violations. Read surrounding code and
existing guards/tests before confirming a finding. Distinguish pre-existing bugs.
Use the independent reviewer protocol below; no speculative stylistic findings.

For each candidate record title, category, repo-relative file, tight current line
range, snippet, rationale/trigger/consequence, fix hint, and verification note.
Deduplicate by root cause; retain the best evidence. Use the historical report score:
0 disproved/pre-existing; 25 unconfirmed/style; 50 confirmed minor/edge case;
75 confirmed material behavior problem; 100 demonstrated critical breakage.
This is not the GitHub criticality score. Keep severity tied to actual impact.
Do not drop an unverified serious candidate as if it were disproved; list it as unverified.

Write `docs/code-reviews/<slug>/iter-<N>.json` without overwriting prior iterations.
Preserve fields `schema_version`, `branch`, `base_ref`, `threshold`, `iteration`,
`timestamp`, `diff_stats`, `summary`, `findings`, `filtered_out`; each finding has
`id`, `category`, `title`, `file`, `line_start`, `line_end`, `snippet`, `rationale`,
`fix_hint`, `score`, `severity`, `verification_note`. Include below-threshold findings
with the exclusion reason and any unverified candidates separately. Use factual
counts, empty findings for a genuinely clean diff, and state incomplete coverage.

Return the report link and important findings with file/line. `--silent` returns only
the report path. No commit, issue, PR comment or code changes in review-only mode.

## Independent reviewers and scoring

Follow `docs/subagents.md`: dispatch its nine reviewer roles as separate subagents,
concurrently up to the runtime limit, queueing the remainder. Use maximum supported
reasoning effort and the configured Codex model. Each gets the same scoped diff,
checkout and applicable conventions, without other reviewers' conclusions.
Require structured role/status/findings/coverage results. Read-only workers do not
fix or publish. Deduplicate candidates by root cause, then dispatch independent
scorer agents (not the candidate's author) to verify evidence and assign the score
below. Batch scorers within the slot limit; the parent adjudicates disagreements.
Record reviewer/scorer statuses and failed/unavailable coverage in the JSON report.
Do not substitute a single-agent sequential review without reporting the limitation.
