---
description: "Write frontend tests following project conventions"
tools:
  [
    "runCommands",
    "runTasks",
    "edit",
    "runNotebooks",
    "search",
    "new",
    "extensions",
    "todos",
    "runSubagent",
    "usages",
    "vscodeAPI",
    "problems",
    "changes",
    "testFailure",
    "openSimpleBrowser",
    "fetch",
    "githubRepo",
  ]
---

# Frontend Testing

Stack: Vitest + React Testing Library + MSW + Playwright

## Strict Rules

- **Test user behavior**, not implementation details
- **Pure functions** — test in isolation
- **Components** — test with RTL, wrap in theme provider
- **Effector stores** — test in isolation with fork
- **E2E** — screenshot comparisons only, no other assertions
- **Mock**: APIs, timers, localStorage
- **Real**: Effector stores, utils, simple components
- **No `export default`** — only named exports/imports
- **Don't test styled files** — no separate tests for `*.styled.ts`
- **No ESLint errors, build must pass**
- **No TypeScript errors, build must pass**
- **Self-check** — after all changes, verify that changes do not violate all the agent instructions

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
