---
description: "Write tests for frontend code following best practices and testing strategies."
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

Follow DRY, KISS, YAGNI, and other best practices for tests.

# Testing Guide Frontend

## Testing Stack

Recommended testing tools for the frontend:

- **Vitest**: Fast test runner (Vite-native alternative to Jest)
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom matchers for DOM
- **MSW (Mock Service Worker)**: API mocking
- **Playwright**: E2E testing framework

## Critical rules

- Test pure functions in isolation.
- Test UI components using RTL.
- Test components with user interactions using RTL.
- Wrap components in theme provider for tests.
- Test Effector stores and models in isolation
- **E2E tests should cover full user flows. Need to compare screenshots for visual regressions and not use other types of assertions.**

## Best Practices

### General Guidelines

- **Test user behavior, not implementation**: Focus on what users see and do
- **Mock external dependencies**: API calls, timers, localStorage
- **Keep tests independent**: Each test should be runnable in isolation

### Mocking vs Real Implementation

- **Mock**: External APIs, complex libraries, slow operations
- **Real**: Effector stores, utility functions, simple components

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Effector Testing](https://effector.dev/docs/api/effector/fork/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
