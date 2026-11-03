---
name: e2e-hunt
description: "Inventory Super App user journeys against existing Playwright tests and produce a prioritized coverage-gap report for a requested area or the whole app."
---

# Inventory E2E coverage

Read `docs/conventions/e2e-testing.md` and the requested area. Inventory real routes,
roles, forms, state transitions and cross-area flows from code/specs. For each
journey record entry, actor, action, success outcome and meaningful negative path.
Include student/admin boundaries and realtime/push when present.

Read `frontend/e2e/**/*.spec.ts` and assertions. Distinguish exercised behavior from
names/route mentions; identify untested branches and draft-only coverage. Do not
inflate coverage by counting several tests of one journey as separate features.
Prioritize data/auth/money and core workflows over incidental UI details; suggest
unit/integration tests where they are the cheaper reliable layer.

Write `docs/e2e-coverage/YYYY-MM-DD-e2e-hunt.md` with a unique suffix, area/journey/test
matrix, coverage status, prioritized gaps, suggested tests and known uncertainty.
Use the existing area/level tags in proposals. This is an inventory, not proof that
tests pass. Do not modify tests, file issues or fix features unless requested.
