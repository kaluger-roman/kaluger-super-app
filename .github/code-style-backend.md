# Code Style Guide For Backend

This guide covers coding conventions, naming patterns, and best practices for the backend part of the project.

## Table of Contents

- [File Naming](#file-naming)
- [TypeScript Conventions](#typescript-conventions)
- [Code Style Conventions](#code-style-conventions)
- [Express Patterns](#express-patterns)
- [Prisma Patterns](#prisma-patterns)
- [Error Handling](#error-handling)
- [Common Patterns](#common-patterns)

## File Naming

Follow these conventions for consistent file organization:

- **Controllers:** `[feature]/[action].ts` or `[feature]/index.ts` (camelCase for files)
- **Routes:** `[feature].ts` (e.g., `students.ts`, `lessons.ts`)
- **Services:** `[feature].ts` or `[featureHelper].ts` (camelCase)
- **Types:** `types/index.ts` (centralized type definitions)
- **Middleware:** `[name].ts` (e.g., `auth.ts`)
- **Utils:** `[utility].ts` (camelCase for utility names)

**Important rules:**

- **Keep type definitions in `src/types/index.ts`** for centralized type management
- Controller actions should be in separate files when logic is complex (more than 50 lines)
- Export all controller functions from `index.ts` for clean imports

## TypeScript Conventions

### Use `type` instead of `interface`

**ALWAYS use `type` instead of `interface`** for type definitions for consistency and better type composition.

```typescript
// ✅ DO use type
type User = {
  id: string;
  email: string;
  name: string;
};

type AuthRequest = Request & {
  user?: JwtPayload;
};

// ❌ DON'T use interface
interface User {
  id: string;
  email: string;
}
```

### Use Prisma-generated types when possible

Leverage Prisma's generated types instead of duplicating definitions.

```typescript
// ✅ DO use Prisma types
import { Prisma, Student, Lesson } from "@prisma/client";

type StudentWithLessons = Prisma.StudentGetPayload<{
  include: { lessons: true };
}>;

// ❌ DON'T duplicate Prisma types manually
type Student = {
  id: string;
  name: string;
  // ... duplicating Prisma schema
};
```

## Code Style Conventions

### Avoid unnecessary small utility functions

Don't extract trivial one-liners unless they provide meaningful abstraction or are reused multiple times (2+).

```typescript
// ❌ DON'T create unnecessary wrapper functions
export const getUserId = (req: AuthRequest): string | undefined => {
  return req.user?.userId;
};

// ✅ DO inline simple logic
const userId = req.user?.userId;
```

**When to extract functions:**

- Logic is reused in 2+ places
- Function provides meaningful abstraction
- Complex validation or transformation logic
- Improves testability

### Don't use JSDoc for obvious code

Code should be self-documenting. Only add comments for complex business logic or non-obvious behavior.

```typescript
// ❌ DON'T add JSDoc for obvious code
/**
 * Gets all students
 * @param req - Request object
 * @param res - Response object
 */
export const getStudents = async (req: AuthRequest, res: Response) => {
  // ...
};

// ✅ DO write self-documenting code
export const getStudents = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const students = await prisma.student.findMany({
    where: { tutorId: userId },
  });
  res.json({ students });
};
```

### Minimize comments in general

Write clear, readable code instead of explaining unclear code with comments.

```typescript
// ❌ DON'T explain obvious logic
export const calculateLessonPrice = (lesson: Lesson, student: Student) => {
  // Check if lesson has price
  if (lesson.price) {
    // Return lesson price
    return lesson.price;
  }
  // Otherwise return student hourly rate
  return student.hourlyRate;
};

// ✅ DO write clear code without noise
export const calculateLessonPrice = (lesson: Lesson, student: Student) => {
  return lesson.price || student.hourlyRate;
};
```

**When comments ARE appropriate:**

- Complex business logic (recurring lessons, scheduling algorithms)
- Workarounds for library bugs
- Performance optimizations that look counterintuitive
- Important architectural decisions

## Express Patterns

### Controller structure

Controllers should handle HTTP concerns only. Move business logic to services.

```typescript
// ✅ DO separate concerns
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const data: CreateStudentDto = req.body;

    // Validation
    const validationErrors = validateCreateStudentDto(data);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Database operation
    const student = await prisma.student.create({
      data: {
        ...data,
        tutorId: userId!,
      },
    });

    res.status(201).json({
      message: "Ученик успешно создан",
      student,
    });
  } catch (error) {
    console.error("Create student error:", error);
    if (handlePrismaError(error, res)) return;
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};

// ❌ DON'T mix concerns in controllers
export const createStudent = async (req: AuthRequest, res: Response) => {
  // Too much business logic in controller
  const student = await someComplexBusinessLogic(req.body);
  // ... hundreds of lines
};
```

### Route definitions

Keep routes clean and use middleware for authentication.

```typescript
// ✅ DO use middleware and clean route definitions
const router = Router();

router.use(authenticateToken); // Apply to all routes

router.get("/", getStudents);
router.get("/:id", getStudent);
router.post("/", createStudent);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);

export default router;
```

### Extend Request type for auth

Create `AuthRequest` type to include user info from JWT middleware.

```typescript
// ✅ DO extend Request with user info
export type AuthRequest = Request & {
  user?: JwtPayload;
};

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers["authorization"]?.split(" "[1];
  if (!token) {
    return res.status(401).json({ error: "Токен доступа обязателен" });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: "Недействительный токен" });
  }

  req.user = payload;
  next();
};
```

## Prisma Patterns

### Use transactions for related operations

Wrap related database operations in transactions.

```typescript
// ✅ DO use transactions for atomicity
const result = await prisma.$transaction(async (tx) => {
  const lesson = await tx.lesson.create({ data: lessonData });
  await tx.student.update({
    where: { id: studentId },
    data: { updatedAt: new Date() },
  });
  return lesson;
});
```

## Error Handling

### Always use try-catch in async controllers

Wrap all async controller logic in try-catch blocks.

```typescript
// ✅ DO use try-catch
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await prisma.student.delete({
      where: { id, tutorId: userId },
    });

    res.json({ message: "Ученик успешно удален" });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
```

### Return Russian error messages

All user-facing error messages should be in Russian.

```typescript
// ✅ DO use Russian error messages
return res.status(400).json({ error: "Токен доступа обязателен" });
return res.status(404).json({ error: "Ученик не найден" });
return res.status(500).json({ error: "Внутренняя ошибка сервера" });

// ❌ DON'T use English for user-facing errors
return res.status(400).json({ error: "Access token required" });
```

### Log errors with context

Always log errors with context for debugging.

```typescript
// ✅ DO log with context
try {
  // ...
} catch (error) {
  console.error("Create student error:", error);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
}
```

## Common Patterns

### Validation functions

Create separate validation functions for complex validation logic.

```typescript
// ✅ DO extract validation logic
export const validateCreateStudentDto = (data: CreateStudentDto): string[] => {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push("Имя студента обязательно");
  }

  if (data.grade && (data.grade < 1 || data.grade > 11)) {
    errors.push("Класс должен быть от 1 до 11");
  }

  return errors;
};

// In controller
const validationErrors = validateCreateStudentDto(data);
if (validationErrors.length > 0) {
  return res.status(400).json({ error: validationErrors[0] });
}
```

### Service layer for business logic

Move complex business logic to service files.

```typescript
// services/recurringLessons.ts
export const processRecurringLessons = async () => {
  const recurringLessons = await prisma.lesson.findMany({
    where: { isRecurring: true, status: "SCHEDULED" },
  });

  // Complex logic for creating future lessons
  // ...
};

// Schedule in index.ts with cron
cron.schedule("0 2 * * *", async () => {
  await processRecurringLessons();
});
```

### WebSocket notifications

Use WebSocket manager for real-time updates.

```typescript
// After database operation
const wsManager = getWebSocketManager();
if (wsManager) {
  wsManager.broadcastLessonStatusUpdate(lesson.id, lesson.status, userId);
}
```

### Time handling utilities

Use utility functions for consistent time handling.

```typescript
// utils/time.ts
export const truncateToMinute = (date: Date): Date => {
  const truncated = new Date(date);
  truncated.setSeconds(0, 0);
  return truncated;
};

// Usage
const start = truncateToMinute(new Date(startTime));
```

### General best practices

- Use async/await for asynchronous code
- Use arrow functions for concise function expressions
- Use destructuring for cleaner code
- Use template literals for string interpolation
- For functions, use types of parameters, not type of function
- Don't use `any` type, use `unknown` instead
- Don't use deprecated features or libraries
- Keep controllers under 150 lines; extract to services if larger
- One controller file per action if action is complex (50+ lines)
- Use meaningful variable names that describe intent
- Keep functions small and focused on single responsibility
