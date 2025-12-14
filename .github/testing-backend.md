# Testing Guide Backend

This guide covers testing strategies, tools, and best practices for the backend application.

## Table of Contents

- [Testing Stack](#testing-stack)
- [Project Setup](#project-setup)
- [Testing Layers](#testing-layers)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Test Patterns](#test-patterns)
- [Best Practices](#best-practices)

## Testing Stack

Recommended testing tools for the backend:

- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertions for testing Express routes
- **@faker-js/faker**: Generate fake data for tests
- **ts-jest**: TypeScript support for Jest
- **@types/jest**: TypeScript types for Jest
- **prisma-mock**: Mocking Prisma Client for unit tests

### Test Setup File

Create `src/__tests__/setup.ts`:

```typescript
import prisma from "../lib/prisma";

// Increase timeout for integration tests
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
```

## Unit Testing

### Testing Pure Functions

Test utilities and helpers in isolation.

### Testing Services with Mocked Prisma

Test business logic services with mocked database.

**Example: Testing recurring lessons service**

```typescript
// src/services/__tests__/recurringLessons.test.ts
import { processRecurringLessons } from "../recurringLessons";
import prisma from "../../lib/prisma";

// Mock Prisma
jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    lesson: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe("processRecurringLessons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create future lessons for recurring lessons", async () => {
    const mockLesson = {
      id: "1",
      tutorId: "tutor-1",
      studentId: "student-1",
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:00:00Z"),
      isRecurring: true,
      status: "SCHEDULED",
    };

    (prisma.lesson.findMany as jest.Mock).mockResolvedValue([mockLesson]);
    (prisma.lesson.findFirst as jest.Mock).mockResolvedValue(mockLesson);
    (prisma.lesson.create as jest.Mock).mockResolvedValue(mockLesson);

    await processRecurringLessons();

    expect(prisma.lesson.findMany).toHaveBeenCalledWith({
      where: { isRecurring: true, status: "SCHEDULED" },
      include: { student: true },
    });
    expect(prisma.lesson.create).toHaveBeenCalled();
  });
});
```

## Integration Testing

### Testing Controllers with Real Database

Use a test database for integration tests.

**Example: Testing student controller**

```typescript
// src/controllers/students/__tests__/createStudent.integration.test.ts
import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../../app"; // Export Express app from separate file
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("POST /api/students", () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed_password",
        name: faker.person.fullName(),
      },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
  });

  afterAll(async () => {
    // Clean up
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("should create a new student", async () => {
    const studentData = {
      name: faker.person.fullName(),
      contactMethod: "WHATSAPP",
      phone: faker.phone.number(),
      grade: 10,
    };

    const response = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send(studentData)
      .expect(201);

    expect(response.body.student).toMatchObject({
      name: studentData.name,
      contactMethod: studentData.contactMethod,
      phone: studentData.phone,
      grade: studentData.grade,
      tutorId: userId,
    });

    // Verify in database
    const student = await prisma.student.findUnique({
      where: { id: response.body.student.id },
    });
    expect(student).toBeTruthy();
  });

  it("should return 400 for invalid data", async () => {
    const response = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "" }) // Invalid: empty name
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it("should return 401 without auth token", async () => {
    await request(app)
      .post("/api/students")
      .send({ name: faker.person.fullName() })
      .expect(401);
  });
});
```

### Testing with Database Transactions

Use transactions to roll back changes after each test.

```typescript
describe("Student CRUD operations", () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Setup code
  });

  afterEach(async () => {
    // Rollback: delete all test data
    await prisma.student.deleteMany({ where: { tutorId: userId } });
  });

  // Tests...
});
```

## E2E Testing

### Testing Complete User Flows

Test entire workflows from start to finish.

**Example: Student and lesson management flow**

```typescript
// src/__tests__/e2e/student-lesson-flow.test.ts
import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../app";
import prisma from "../../lib/prisma";

describe("E2E: Student and Lesson Management", () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Register and login
    const userData = {
      email: faker.internet.email(),
      password: "Test123!",
      name: faker.person.fullName(),
    };

    await request(app).post("/api/auth/register").send(userData);

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: userData.email, password: userData.password });

    authToken = loginResponse.body.token;
    userId = loginResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("should complete full workflow: create student, create lesson, update status", async () => {
    // 1. Create student
    const studentResponse = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        phone: faker.phone.number(),
      })
      .expect(201);

    const studentId = studentResponse.body.student.id;

    // 2. Create lesson
    const lessonData = {
      subject: "MATHEMATICS",
      lessonType: "EGE",
      startTime: new Date(Date.now() + 86400000), // Tomorrow
      endTime: new Date(Date.now() + 86400000 + 3600000), // Tomorrow + 1 hour
      studentId,
    };

    const lessonResponse = await request(app)
      .post("/api/lessons")
      .set("Authorization", `Bearer ${authToken}`)
      .send(lessonData)
      .expect(201);

    const lessonId = lessonResponse.body.lesson.id;

    // 3. Get lessons
    const lessonsResponse = await request(app)
      .get("/api/lessons")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(lessonsResponse.body.lessons).toContainEqual(
      expect.objectContaining({ id: lessonId })
    );

    // 4. Update lesson status
    await request(app)
      .put(`/api/lessons/${lessonId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ status: "COMPLETED", grade: 5 })
      .expect(200);

    // 5. Verify statistics updated
    const statsResponse = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(statsResponse.body.statistics.completedLessons).toBeGreaterThan(0);
  });
});
```

## Test Patterns

### Test Structure (AAA Pattern)

Use Arrange-Act-Assert pattern:

```typescript
it("should do something", async () => {
  // Arrange: Setup test data
  const input = { name: "Test" };

  // Act: Execute the code under test
  const result = await functionUnderTest(input);

  // Assert: Verify the result
  expect(result).toBe(expected);
});
```

### Test Data Factories

Create reusable test data factories:

```typescript
// src/__tests__/factories/student.factory.ts
import { faker } from "@faker-js/faker";
import { CreateStudentDto } from "../../types";

export const createStudentData = (
  overrides?: Partial<CreateStudentDto>
): CreateStudentDto => ({
  name: faker.person.fullName(),
  contactMethod: "WHATSAPP",
  phone: faker.phone.number(),
  grade: faker.number.int({ min: 1, max: 11 }),
  ...overrides,
});

// Usage
const studentData = createStudentData({ name: "Custom Name" });
```

### Mocking External Dependencies

Mock WebSocket manager, cron jobs, and external services:

```typescript
// Mock WebSocket manager
jest.mock("../../lib/wsManager", () => ({
  getWebSocketManager: jest.fn(() => ({
    broadcastLessonStatusUpdate: jest.fn(),
  })),
}));

// Mock cron
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));
```

## Best Practices

### General Guidelines

- **One assertion per test**: Keep tests focused and easy to debug
- **Descriptive test names**: Use "should [expected behavior] when [condition]"
- **Test edge cases**: Invalid input, empty arrays, null values
- **Avoid test interdependence**: Each test should be independent
- **Clean up after tests**: Always clean up database records

### Test Naming

```typescript
// ✅ DO use descriptive names
it("should return 400 when student name is empty", async () => {});
it("should create recurring lessons for 3 months", async () => {});

// ❌ DON'T use vague names
it("test1", async () => {});
it("should work", async () => {});
```

### Async/Await

Always use async/await, never callbacks:

```typescript
// ✅ DO use async/await
it("should create student", async () => {
  const result = await createStudent(data);
  expect(result).toBeDefined();
});

// ❌ DON'T use callbacks
it("should create student", (done) => {
  createStudent(data).then((result) => {
    expect(result).toBeDefined();
    done();
  });
});
```

### Error Testing

Test error cases explicitly:

```typescript
it("should throw error for invalid lesson time", async () => {
  const invalidData = {
    startTime: new Date(),
    endTime: new Date(Date.now() - 3600000), // End before start
  };

  await expect(createLesson(invalidData)).rejects.toThrow(
    "Время окончания должно быть позже времени начала"
  );
});
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Testing Best Practices](https://testingjavascript.com/)
