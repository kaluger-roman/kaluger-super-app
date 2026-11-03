# Frontend

Read `../docs/conventions/frontend.md` before app changes and
`../docs/conventions/frontend-testing.md` before unit/component tests.
For `e2e/` or Playwright config, read `../docs/conventions/e2e-testing.md`.

FSD imports go down: pages → features → entities → shared. Use public barrels and
existing aliases. State belongs in Effector: `sample`, `useUnit`, namespace models;
no `.watch()`/`getState()` in production logic. Preserve Russian UI and accessibility.
Use the established styled API rather than inline styles or `sx`.

Run from this package: `npm test -- <path>`, `npm run lint`, `npx tsc --noEmit`.
Root `npm run check` combines relevant checks. Development and Playwright run via
root `scripts/dev-stack.sh` to select the checkout's API and database.
Unit tests must not make real network calls; use MSW/fork handlers. Use observable
behavior assertions; do not assert styled implementation details.
