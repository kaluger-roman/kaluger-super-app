---
name: e2e-check
description: "Audit the Super App branch diff for missing, affected or obsolete Playwright coverage; optionally prepare draft tests."
---

# Check E2E coverage of a change

Read `docs/conventions/e2e-testing.md` and `frontend/e2e/README.md`. Resolve the
requested base (default verified origin/main/main), and inspect committed plus
staged/unstaged changes and relevant untracked files without changing the index.

Map behavior changes in routes/pages, forms, API contracts, business rules,
notifications and realtime to user journeys. Read existing tests' assertions;
a shared filename, route mention or test title alone is not proof of coverage.
Classify each changed journey as covered, uncovered, possibly-affected, dead
(removed flow still tested), or uncertain. Separate unit-testable detail from true
end-to-end behavior. Styling changes can affect accessibility/layout and should not
be discarded solely because of the file extension.

Write a unique `docs/e2e-coverage/checks/YYYY-MM-DD-<slug>.md` with files/journeys,
matching tests and assertions, risk, gaps, uncertainty, and recommended scenarios.
Do not report static inspection as a successful browser run.

If draft tests are requested, create non-overwriting `<flow>.draft.spec.ts` files
with valid area tags and `@draft`, Russian descriptions and selectors grounded in
actual UI/code. Mark incomplete steps honestly; do not invent selectors or passing
coverage. Refined tests replace `@draft` with `@regression`. Changes to executable
tests require applicable lint/type checks and an actual run when feasible.
