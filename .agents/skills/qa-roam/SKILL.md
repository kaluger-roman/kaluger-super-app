---
name: qa-roam
description: "Explore the running Super App as a user to find visible usability problems and bugs, saving a screenshot-backed report without modifying app code."
---

# Exploratory browser QA

Read `AGENTS.md` and `docs/qa-docker.md`. Default to the isolated QA stack; URL override
or `--host` uses an existing authorized environment (host URL from dev-stack ports).
Seed demo data only in the isolated QA database. Optional `--teardown` cleans up that
QA stack after reporting; otherwise leave it running for inspection.

Discover actual routes/roles from the app and choose 2–3 areas unless the user
specified an area/time/scenario budget. Mix realistic journeys and variations:
empty data, interrupted input, refresh/back, repeated action, mobile width, multiple
roles or realtime. Keep the run bounded; the old Claude subscription percentage
budget is unsupported, so use a stated scenario or time limit instead.

Findings must be observable by a tutor/student and backed by steps and evidence.
Validate before reporting: disabled actions without explanation, stale lists,
misleading errors, lost input, access leakage, navigation/layout obstacles. Avoid
pure color/style preference or code-only maintainability findings. Inspect browser
errors only when they explain visible behavior.

Write `docs/qa-roam-reports/YYYY-MM-DD-qa-roam.md` (unique suffix on repeat), with
revision, URL, tested routes/scenarios, findings, user impact, expected/actual behavior,
reproduction, evidence/screenshots and untested areas. Use ignored screenshots paths.
Do not edit code, run unrelated suites, publish issues, or make commits. A request
for a later fix/issue uses the relevant separate workflow.
