---
name: code-review-local
description: "Review Super App branch and uncommitted changes for substantiated defects and produce the existing local JSON review report."
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
No fixed reviewer count, model name or speculative stylistic findings.

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
