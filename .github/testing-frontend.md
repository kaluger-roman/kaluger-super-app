# Testing Guide Frontend

This guide covers testing strategies, tools, and best practices for the frontend application.

## Table of Contents

- [Testing Stack](#testing-stack)
- [Project Setup](#project-setup)
- [Testing Layers](#testing-layers)
- [Unit Testing](#unit-testing)
- [Component Testing](#component-testing)
- [Integration Testing](#integration-testing)
- [Effector Testing](#effector-testing)
- [E2E Testing](#e2e-testing)
- [Test Patterns](#test-patterns)
- [Best Practices](#best-practices)

## Testing Stack

Recommended testing tools for the frontend:

- **Vitest**: Fast test runner (Vite-native alternative to Jest)
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom matchers for DOM
- **MSW (Mock Service Worker)**: API mocking
- **Playwright**: E2E testing framework

### Test Setup File

Create `src/__tests__/setup.ts`:

```typescript
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { allSettled, fork } from "effector";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup MSW
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### MSW Setup

Create `src/__tests__/mocks/handlers.ts`:

```typescript
import { rest } from "msw";

const API_URL = "http://localhost:3001/api";

export const handlers = [
  // Students
  rest.get(`${API_URL}/students`, (req, res, ctx) => {
    return res(
      ctx.json({
        students: [
          { id: "1", name: "Test Student", grade: 10, tutorId: "user-1" },
        ],
      })
    );
  }),

  rest.post(`${API_URL}/students`, (req, res, ctx) => {
    return res(
      ctx.json({
        message: "Ученик успешно создан",
        student: { id: "2", ...req.body },
      })
    );
  }),

  // Lessons
  rest.get(`${API_URL}/lessons`, (req, res, ctx) => {
    return res(
      ctx.json({
        lessons: [
          {
            id: "1",
            subject: "MATHEMATICS",
            lessonType: "EGE",
            status: "SCHEDULED",
            studentId: "1",
          },
        ],
      })
    );
  }),

  // Auth
  rest.post(`${API_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.json({
        token: "mock-jwt-token",
        user: { id: "user-1", email: "test@example.com", name: "Test User" },
      })
    );
  }),
];
```

Create `src/__tests__/mocks/server.ts`:

```typescript
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

## Unit Testing

### Testing Utility Functions

Test pure functions in isolation.

**Example: Testing formatters**

```typescript
// src/shared/lib/__tests__/formatters.test.ts
import { describe, it, expect } from "vitest";
import { formatDate, formatPrice, formatPhoneNumber } from "../formatters";

describe("formatDate", () => {
  it("should format date in DD.MM.YYYY format", () => {
    const date = new Date("2024-01-15");
    expect(formatDate(date)).toBe("15.01.2024");
  });

  it("should handle invalid date", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatPrice", () => {
  it("should format price with currency symbol", () => {
    expect(formatPrice(1000)).toBe("1 000 ₽");
  });

  it("should handle zero", () => {
    expect(formatPrice(0)).toBe("0 ₽");
  });
});

describe("formatPhoneNumber", () => {
  it("should format Russian phone number", () => {
    expect(formatPhoneNumber("79991234567")).toBe("+7 (999) 123-45-67");
  });
});
```

### Testing Validation Functions

```typescript
// src/features/students/__tests__/validation.test.ts
import { describe, it, expect } from "vitest";
import { validateStudentForm } from "../validation";

describe("validateStudentForm", () => {
  it("should return no errors for valid data", () => {
    const data = {
      name: "Test Student",
      contactMethod: "WHATSAPP",
      phone: "+79991234567",
    };

    const errors = validateStudentForm(data);
    expect(errors).toEqual({});
  });

  it("should return error for empty name", () => {
    const data = {
      name: "",
      contactMethod: "WHATSAPP",
    };

    const errors = validateStudentForm(data);
    expect(errors.name).toBe("Имя обязательно");
  });

  it("should return error for invalid grade", () => {
    const data = {
      name: "Test",
      contactMethod: "WHATSAPP",
      grade: 15,
    };

    const errors = validateStudentForm(data);
    expect(errors.grade).toBe("Класс должен быть от 1 до 11");
  });
});
```

## Component Testing

### Testing Presentational Components

Test UI components without state.

**Example: Testing StudentCard component**

```typescript
// src/entities/student/ui/__tests__/StudentCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudentCard } from "../StudentCard";

describe("StudentCard", () => {
  const mockStudent = {
    id: "1",
    name: "Test Student",
    grade: 10,
    contactMethod: "WHATSAPP",
    phone: "+79991234567",
  };

  it("should render student name", () => {
    render(<StudentCard student={mockStudent} />);
    expect(screen.getByText("Test Student")).toBeInTheDocument();
  });

  it("should render grade", () => {
    render(<StudentCard student={mockStudent} />);
    expect(screen.getByText("10 класс")).toBeInTheDocument();
  });

  it("should render contact info", () => {
    render(<StudentCard student={mockStudent} />);
    expect(screen.getByText("+79991234567")).toBeInTheDocument();
  });

  it("should not render grade if not provided", () => {
    const studentWithoutGrade = { ...mockStudent, grade: null };
    render(<StudentCard student={studentWithoutGrade} />);
    expect(screen.queryByText(/класс/)).not.toBeInTheDocument();
  });
});
```

### Testing Interactive Components

Test components with user interactions.

**Example: Testing form component**

```typescript
// src/features/students/ui/__tests__/StudentForm.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentForm } from "../StudentForm";

describe("StudentForm", () => {
  it("should call onSubmit with form data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<StudentForm onSubmit={onSubmit} />);

    // Fill form
    await user.type(screen.getByLabelText("Имя"), "Test Student");
    await user.type(screen.getByLabelText("Телефон"), "+79991234567");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Test Student",
      phone: "+79991234567",
    });
  });

  it("should display validation errors", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<StudentForm onSubmit={onSubmit} />);

    // Submit empty form
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(screen.getByText("Имя обязательно")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

### Testing with Material UI Theme

Wrap components in theme provider for tests.

```typescript
// src/__tests__/utils/renderWithTheme.tsx
import { ReactElement } from "react";
import { render } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../app/theme";

export const renderWithTheme = (component: ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Usage
import { renderWithTheme } from "../../__tests__/utils/renderWithTheme";

it("should render with theme", () => {
  renderWithTheme(<MyComponent />);
});
```

## Effector Testing

### Testing Stores and Events

Test Effector stores in isolation.

**Example: Testing student model**

```typescript
// src/features/students/__tests__/students.model.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { fork, allSettled } from "effector";
import { $students, studentsLoadFx, studentAdded } from "../students.model";

describe("students model", () => {
  it("should load students", async () => {
    const scope = fork();

    await allSettled(studentsLoadFx, { scope });

    expect(scope.getState($students)).toHaveLength(1);
    expect(scope.getState($students)[0].name).toBe("Test Student");
  });

  it("should add student to store", async () => {
    const scope = fork({
      values: [[$students, []]],
    });

    const newStudent = {
      id: "2",
      name: "New Student",
      grade: 11,
    };

    await allSettled(studentAdded, {
      scope,
      params: newStudent,
    });

    const students = scope.getState($students);
    expect(students).toHaveLength(1);
    expect(students[0]).toEqual(newStudent);
  });
});
```

### Testing Sample Logic

Test complex Effector logic with `sample`.

```typescript
// src/features/lessons/__tests__/lessons.model.test.ts
import { describe, it, expect } from "vitest";
import { fork, allSettled } from "effector";
import {
  $lessons,
  $filteredLessons,
  filterChanged,
  lessonsLoadFx,
} from "../lessons.model";

describe("lessons filtering", () => {
  it("should filter lessons by status", async () => {
    const scope = fork({
      values: [
        [
          $lessons,
          [
            { id: "1", status: "SCHEDULED" },
            { id: "2", status: "COMPLETED" },
          ],
        ],
      ],
    });

    await allSettled(filterChanged, {
      scope,
      params: { status: "COMPLETED" },
    });

    const filtered = scope.getState($filteredLessons);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("2");
  });
});
```

### Testing with Gates

Test page lifecycle with Gates.

```typescript
// src/pages/students/__tests__/StudentsPage.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { fork, allSettled } from "effector";
import { Provider } from "effector-react";
import { StudentsPage } from "../StudentsPage";
import { studentsLoadFx } from "../../../features/students";

describe("StudentsPage", () => {
  it("should load students on mount", async () => {
    const scope = fork();
    const loadSpy = vi.fn();

    studentsLoadFx.use(loadSpy);

    render(
      <Provider value={scope}>
        <StudentsPage />
      </Provider>
    );

    await waitFor(() => {
      expect(loadSpy).toHaveBeenCalled();
    });
  });
});
```

## Integration Testing

### Testing Features with State

Test features that combine components and state.

**Example: Testing student creation flow**

```typescript
// src/features/students/__tests__/createStudent.integration.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fork } from "effector";
import { Provider } from "effector-react";
import { CreateStudentFeature } from "../CreateStudentFeature";
import { $students } from "../students.model";

describe("CreateStudent integration", () => {
  it("should create student and add to list", async () => {
    const user = userEvent.setup();
    const scope = fork({
      values: [[$students, []]],
    });

    render(
      <Provider value={scope}>
        <CreateStudentFeature />
      </Provider>
    );

    // Fill form
    await user.type(screen.getByLabelText("Имя"), "New Student");
    await user.type(screen.getByLabelText("Телефон"), "+79991234567");
    await user.click(screen.getByRole("button", { name: "Создать" }));

    // Wait for API call and state update
    await waitFor(() => {
      const students = scope.getState($students);
      expect(students).toHaveLength(1);
      expect(students[0].name).toBe("New Student");
    });

    // Check success message
    expect(screen.getByText("Ученик успешно создан")).toBeInTheDocument();
  });
});
```

## E2E Testing

### E2E Test Example

```typescript
// e2e/student-management.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Student Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");
  });

  test("should create new student", async ({ page }) => {
    // Navigate to students
    await page.click("text=Ученики");
    await expect(page).toHaveURL("/students");

    // Open create form
    await page.click('button:has-text("Добавить ученика")');

    // Fill form
    await page.fill('input[name="name"]', "E2E Test Student");
    await page.fill('input[name="phone"]', "+79991234567");
    await page.selectOption('select[name="grade"]', "10");

    // Submit
    await page.click('button:has-text("Создать")');

    // Verify success
    await expect(page.locator("text=E2E Test Student")).toBeVisible();
  });

  test("should edit student", async ({ page }) => {
    await page.goto("/students");

    // Click edit button on first student
    await page.click('[data-testid="edit-student-1"]');

    // Update name
    await page.fill('input[name="name"]', "Updated Name");
    await page.click('button:has-text("Сохранить")');

    // Verify update
    await expect(page.locator("text=Updated Name")).toBeVisible();
  });

  test("should delete student", async ({ page }) => {
    await page.goto("/students");

    // Click delete button
    await page.click('[data-testid="delete-student-1"]');

    // Confirm deletion
    await page.click('button:has-text("Удалить")');

    // Verify deleted
    await expect(page.locator('[data-testid="student-1"]')).not.toBeVisible();
  });
});
```

## Test Patterns

### Custom Render Utility

Create custom render with all providers.

```typescript
// src/__tests__/utils/render.tsx
import { ReactElement } from "react";
import { render } from "@testing-library/react";
import { fork, Scope } from "effector";
import { Provider } from "effector-react";
import { ThemeProvider } from "@mui/material/styles";
import { BrowserRouter } from "react-router-dom";
import { theme } from "../../app/theme";

export const renderWithProviders = (component: ReactElement, scope?: Scope) => {
  const testScope = scope || fork();

  return render(
    <Provider value={testScope}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>{component}</BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};
```

### Test Data Factories

Create reusable test data:

```typescript
// src/__tests__/factories/student.ts
type StudentData = {
  id?: string;
  name?: string;
  grade?: number;
  phone?: string;
};

export const createMockStudent = (overrides?: StudentData) => ({
  id: "1",
  name: "Test Student",
  grade: 10,
  contactMethod: "WHATSAPP" as const,
  phone: "+79991234567",
  tutorId: "user-1",
  createdAt: new Date().toISOString(),
  ...overrides,
});
```

## Best Practices

### General Guidelines

- **Test user behavior, not implementation**: Focus on what users see and do
- **Use `data-testid` sparingly**: Prefer accessible queries (getByRole, getByLabelText)
- **Avoid testing styling**: Test functionality, not CSS
- **Mock external dependencies**: API calls, timers, localStorage
- **Keep tests independent**: Each test should be runnable in isolation

### Accessible Queries Priority

```typescript
// ✅ DO use accessible queries
screen.getByRole("button", { name: "Создать" });
screen.getByLabelText("Имя студента");
screen.getByText("Test Student");

// ❌ DON'T overuse testId
screen.getByTestId("create-button");
```

### Testing Async Updates

```typescript
// ✅ DO use waitFor for async updates
await waitFor(() => {
  expect(screen.getByText("Success")).toBeInTheDocument();
});

// ❌ DON'T use arbitrary timeouts
await new Promise((resolve) => setTimeout(resolve, 1000));
```

### Mocking vs Real Implementation

- **Mock**: External APIs, complex libraries, slow operations
- **Real**: Effector stores, utility functions, simple components

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Effector Testing](https://effector.dev/docs/api/effector/fork/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
