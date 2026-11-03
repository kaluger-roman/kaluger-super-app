---
name: manual-qa
description: "Verify a Super App feature or branch in the browser against its acceptance scenarios, producing a QA report and structured findings; optional fixes."
---

# Feature browser QA

Read `AGENTS.md`, `docs/qa-docker.md` and the relevant spec, quickstart, tasks, contracts
and data model. Resolve a full spec name explicitly (numeric prefixes can repeat).
Without a spec derive scenarios from the actual diff and say so in the report.

Inputs: feature id, optional URL, `--host`, `--fix`, `--teardown`, `--context PATH`.
Default: `bash scripts/qa-stack.sh up` and use returned URL/credentials. `--host` uses
the current checkout's URL from `bash scripts/dev-stack.sh ports`, never fixed 3000.
An explicit URL skips stack creation; it does not authorize destructive operations
against an external/production environment. Demo seed runs only in the isolated QA
container with `bash scripts/qa-stack.sh exec-backend 'npm run db:seed'`.

Plan unique scenarios with steps and expected results: all P1 acceptance scenarios,
relevant edge/negative paths, authorization boundaries, affected-role smoke, realtime
across users, and responsive layouts. Prioritize essential scenarios and explicitly
list uncovered cases. Do not claim complete coverage if a scenario was not run.
A round context may provide `must_check`, `recheck`, `covered_scenarios` and
`known_open_findings`: recheck fixes first, then required/new cases; avoid duplicates.

Use available browser tooling/Playwright with fresh page state. Compare actual UI
and API behavior to acceptance criteria; capture console/network evidence where
available and screenshots of key states/findings. Verify observed effects, not just
successful clicks. Use only test data. No real email, production backup or secret
retrieval is needed; QA email codes can be read inside its database.

Write a unique `docs/manual-qa-reports/YYYY-MM-DD-<slug>.md` and adjacent
`.findings.json`. Markdown contains tested revision/URL, setup, scenarios with
expected/actual result, findings, screenshots and untested/blocked cases. JSON
contains `schema_version`, `feature`, `branch`, `findings`, `recheck_results`, and
`coverage: {scenarios, untested}`. Findings include id, scenario_id, title, category,
severity, steps, expected, actual, evidence, fix_suggestion and status. Screenshots
belong in an ignored `screenshots/` subdirectory, never the Git history.

With `--fix`, fix confirmed in-scope defects, add regression tests and rerun the failed
scenario. Flag ambiguous product decisions without guessing; preserve the original
finding and record its new status. Without --fix do not edit app code.
Leave the stack available for inspection; `--teardown` removes only the QA stack
created/selected for this run. Return report links, results, URL and limitations.
