---
name: improve-hunt
description: "Find and validate improvements in Super App code; supports deduplicated GitHub issues, report-only audits and selected fixes."
---

# Hunt improvements

Read `AGENTS.md`, relevant conventions, existing reports and requested area.
Assess UX/accessibility, security, performance, repeated work, maintainability and developer friction. Separate actionable improvements from entirely new product features or subjective restyling.

Modes:
- Explicit `$improve-hunt` without another mode preserves the old issues workflow: file
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

Write report-only/fix results to `docs/improvement-reports/YYYY-MM-DD-improve-hunt.md`, with numeric
suffix if needed. Preserve prior reports. Include rejected/unverified candidates
separately and say what was not examined. For issues return links, scores and duplicates;
if GitHub is unavailable preserve local bodies and report partial completion.

For selected fixes follow [auto-bug-fix](../auto-bug-fix/SKILL.md) for defects or
implement the bounded improvement with tests. Review and verify affected behavior;
stop additional review rounds when no new relevant findings remain. Do not merge,
deploy or change unrelated product behavior.
