# Frontend Testing Conventions

Stack: Vitest + React Testing Library + MSW + Playwright

## Rules

- **Test user behavior**, not implementation details
- **Pure functions** — test in isolation
- **Components** — test with RTL, wrap in theme provider
- **Effector stores** — test in isolation with fork
- **No `.watch()` in tests** (ESLint `effector/no-watch`) — observe events/effects with `createWatch({ unit, fn, scope })` from `effector`; it is scope-bound, so watchers don't leak between tests
- **E2E** — see `docs/conventions/e2e-testing.md`. Two modes: functional user-journey tests (default) and visual regression (`@visual` tag).
- **Mock**: APIs, timers, localStorage
- **Real**: Effector stores, utils, simple components
- **No `export default`** — only named exports/imports
- **Don't test styled files** — no separate tests for `*.styled.ts`
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
