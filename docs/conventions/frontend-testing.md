# Frontend Testing Conventions

Stack: Vitest + React Testing Library + MSW + Playwright

## Rules

- **Test user behavior**, not implementation details
- **Pure functions** — test in isolation
- **Components** — test with RTL, wrap in theme provider
- **Effector stores** — test in isolation with fork
- **No `.watch()` in tests** (ESLint `effector/no-watch`) — observe events/effects with `createWatch({ unit, fn, scope })` from `effector`; it is scope-bound, so watchers don't leak between tests
- **No `.only` / `.skip` in committed tests** (ESLint `jest/no-focused-tests`, `jest/no-disabled-tests` — the rules also catch `describe` / `it` / `test` imported from `vitest`)
- **E2E** — see `docs/conventions/e2e-testing.md`. Two modes: functional user-journey tests (default) and visual regression (`@visual` tag).
- **Mock**: APIs, timers, localStorage
- **No network in unit tests** — `src/__tests__/setup.ts` starts MSW (`src/__tests__/mocks/server.ts`) with a catch-all handler: a request no handler answers gets a network error and fails the test that sent it, with the method and URL in the message. Answer the request where the test can see it:
  - an effect the scenario runs — `fork({ handlers })`; the lesson list reloads that follow a lesson or filter change — `...lessonListLoadHandlers()` from `@entities/lesson/testSeams.helpers` first in the list
  - a file that already mocks `@shared` — add the API to the `vi.mock` factory
  - a nested feature that loads its own data (the invitation block in a student card, background requests after boot) — `server.use(http.get("*/api/...", () => HttpResponse.json(...)))`; shared ones live in `src/__tests__/mocks/handlers.ts` (`signedInBackgroundHandlers`)
- **Real**: Effector stores, utils, simple components
- **No `export default`** — only named exports/imports
- **Don't test styled files** — no separate tests for `*.styled.ts`
- **Test seams stay out of the public API** — a feature's swappable adapters and resets for tests (e.g. `setWebRtcAdapter`, `resetCallTransportsForTests`) are exported from `<feature>/testSeams.helpers.ts`, never from the feature's `index.ts`; production code never imports that file. Tests inside the feature import the model files directly
- **No pixel assertions from styled files** — assert observable differences (text, roles, `data-*` state such as `data-layout` / `data-compact`), not `top: "44px"`; layout pixels belong to `@visual` e2e
- **Reset mocks, not just clear them** — `mockReset()` (or `vi.resetAllMocks()`) in `beforeEach` when tests queue `mockResolvedValueOnce` / `mockReturnValueOnce`; `clearAllMocks` keeps the queued implementations and leaks them into the next test
- **No ESLint errors** — run `npm run lint` and fix all errors before finishing
- **No TypeScript errors** — run `npx tsc --noEmit` and fix all errors before finishing

## Test isolation

Vitest runs two projects (`frontend/vitest.config.ts`, split by `frontend/vitest.isolation.ts`):

- **isolated** — every test file that calls `vi.mock` / `vi.doMock`, plus files marked `// @vitest-isolate: <why>`. Each file gets its own module graph, as before. Nothing to do by hand: a new file with `vi.mock` lands here on its own.
- **shared** — all other files. A worker loads MUI, the models and the rest once and runs file after file on the same modules, which makes the suite about 3× faster. `src/__tests__/sharedModels.setup.ts` loads every `*.model.ts` up front, so the model wiring is the same in every file and every order. The files run in a random order, so a test that leaks state into the next file fails early instead of by luck. The seed is printed at the start (`vitest: shared project file order seed …`); reproduce with `VITEST_SEED=<seed> npx vitest run --project shared`.

Rules for a shared file (the default):

- **Effector state through `fork`** — a scope per test, never global store values left behind
- **Stubs are undone after each test** — `src/__tests__/setup.ts` already restores timers, `vi.stubGlobal` / `vi.stubEnv`, `localStorage` and `sessionStorage`; restore spies (`vi.restoreAllMocks()`) and module-level registries the test touched (e.g. `resetCallTransportsForTests`) in `afterEach`
- **Every model reacts, as in the app** — an event the test fires reaches all models that listen to it, loaded or not by the test file itself; answer the requests they send (see "No network in unit tests") instead of counting on a model not being there
- **Module singletons you cannot reset** (a cached `AudioContext`, a one-time init) — mark the file `// @vitest-isolate: <why>` at the top instead of adding a reset to production code

## Test Naming

```typescript
// ✅ Descriptive
it("should show error when email is invalid", () => {});

// ❌ Vague
it("test validation", () => {});
```

## Component Test Example

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { theme } from "@shared";

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

it("should submit form with valid data", async () => {
  renderWithTheme(<LoginForm />);
  await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
  await userEvent.click(screen.getByRole("button", { name: /submit/i }));
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```
