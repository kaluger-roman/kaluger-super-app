---
description: "Write tests for backend code following best practices and testing strategies."
tools:
  [
    "runCommands",
    "runTasks",
    "edit",
    "runNotebooks",
    "search",
    "new",
    "cweijan.vscode-postgresql-client2/dbclient-getDatabases",
    "cweijan.vscode-postgresql-client2/dbclient-getTables",
    "cweijan.vscode-postgresql-client2/dbclient-executeQuery",
    "prisma.prisma-insider/prisma-migrate-status",
    "prisma.prisma-insider/prisma-migrate-dev",
    "prisma.prisma-insider/prisma-migrate-reset",
    "prisma.prisma-insider/prisma-studio",
    "prisma.prisma-insider/prisma-platform-login",
    "prisma.prisma-insider/prisma-postgres-create-database",
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

# Testing Guide Backend

This guide covers testing strategies, tools, and best practices for the backend application.

## Testing Stack

Recommended testing tools for the backend:

- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertions for testing Express routes
- **@faker-js/faker**: Generate fake data for tests
- **ts-jest**: TypeScript support for Jest
- **@types/jest**: TypeScript types for Jest
- **prisma-mock**: Mocking Prisma Client for unit tests

## Critical rules

- **Do not mock Prisma**, use a separate test database.
- Use Arrange-Act-Assert pattern:
- Create reusable test data factories
- Keep tests focused and easy to debug
- **Descriptive test names**: Use "should [expected behavior] when [condition]"
- **Test edge cases**: Invalid input, empty arrays, null values
- **Avoid test interdependence**: Each test should be independent
- **Clean up after tests**: Always clean up database records

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
