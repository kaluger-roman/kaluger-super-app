---
name: bug-hunt
description: "Find and validate bugs in Super App code; supports deduplicated GitHub issues, report-only audits and selected fixes."
---

# Hunt bugs

Read `AGENTS.md`, relevant conventions, existing reports and requested area.
Trace errors, edge cases, ownership/auth, monetary calculations, timezone/date boundaries, races, cleanup and realtime consistency.

Modes:
- Explicit `$bug-hunt` without another mode preserves the old issues workflow: file
  confirmed findings using [create-issue](../create-issue/SKILL.md), including duplicate
  search and scoring. The explicit skill invocation covers those issue writes.
- `--report`, or implicit selection for a plain audit request: local report only.
- `--fix`: report findings, then fix the selection already authorized by the user.
  If a broad hunt has no selected scope, present the concrete candidates before
  expanding into fixes. No issue publication is implied by fix mode.

Inventory the requested area before diving into one file. Validate each candidate
against callers, types, guards and tests; reproduce when practical. Exclude false
positives, unproven assumptions and duplicate root causes. For each include evidence,
trigger, expected/actual outcome, impact, severity, location and a concrete fix idea.
Do not perform changes outside the chosen scope or silently turn the audit into
unbounded whole-repo work.

Write report-only/fix results to `docs/bug-reports/YYYY-MM-DD-bug-hunt.md`, with numeric
suffix if needed. Preserve prior reports. Include rejected/unverified candidates
separately and say what was not examined. For issues return links, scores and duplicates;
if GitHub is unavailable preserve local bodies and report partial completion.

For selected fixes follow [auto-bug-fix](../auto-bug-fix/SKILL.md) for defects or
implement the bounded improvement with tests. Review and verify affected behavior;
stop additional review rounds when no new relevant findings remain. Do not merge,
deploy or change unrelated product behavior.

## Parallel investigation

Use subagents according to `docs/subagents.md`: separate workers for Effector/model,
React/UI, backend services/controllers, auth/security, realtime/cron, data/Prisma/
migrations, and hidden bugs/false-positive tests. For a bounded request scope each
role to that area and explicitly omit inapplicable roles. Run independent workers
concurrently within available slots, queueing the rest, with maximum supported
reasoning effort. Each returns at most five evidenced candidates and coverage.
The parent validates, deduplicates and handles the chosen report/issues/fix mode;
workers do not edit code or file issues. Record failed/unexamined areas honestly.
