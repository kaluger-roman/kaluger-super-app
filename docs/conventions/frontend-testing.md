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
- **Real**: Effector stores, utils, simple components
- **No `export default`** — only named exports/imports
- **Don't test styled files** — no separate tests for `*.styled.ts`
- **Test seams stay out of the public API** — a feature's swappable adapters and resets for tests (e.g. `setWebRtcAdapter`, `resetCallTransportsForTests`) are exported from `<feature>/testSeams.helpers.ts`, never from the feature's `index.ts`; production code never imports that file. Tests inside the feature import the model files directly
- **No pixel assertions from styled files** — assert observable differences (text, roles, `data-*` state such as `data-layout` / `data-compact`), not `top: "44px"`; layout pixels belong to `@visual` e2e
- **Reset mocks, not just clear them** — `mockReset()` (or `vi.resetAllMocks()`) in `beforeEach` when tests queue `mockResolvedValueOnce` / `mockReturnValueOnce`; `clearAllMocks` keeps the queued implementations and leaks them into the next test
- **No ESLint errors** — run `npm run lint` and fix all errors before finishing
- **No TypeScript errors** — run `npx tsc --noEmit` and fix all errors before finishing

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
