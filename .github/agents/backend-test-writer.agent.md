---
description: "Write backend tests following project conventions"
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

# Backend Testing

Stack: Jest + Supertest + Faker + test database

## Strict Rules

- **Do NOT mock Prisma** — use separate test database
- **Clean up after tests** — delete created records
- **Tests must be independent** — no shared state between tests
- **Always async/await** — never callbacks
- **Test edge cases** — invalid input, empty arrays, null values
- **No `export default`** — only named exports/imports

## Test Naming

```typescript
// ✅ Descriptive: "should [behavior] when [condition]"
it("should return 400 when student name is empty", async () => {});

// ❌ Vague
it("test validation", async () => {});
```

## Integration Test Template

```typescript
import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../../app";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("POST /api/students", () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: faker.internet.email(), password: "hash", name: "Test" },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
  });

  afterAll(async () => {
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("should create student with valid data", async () => {
    const response = await request(app)
      .post("/api/students")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Student", contactMethod: "WHATSAPP", grade: 10 })
      .expect(201);

    expect(response.body.student).toMatchObject({ name: "Student", tutorId: userId });
  });
});
```

## Mocking External Services

```typescript
// WebSocket
jest.mock("../../lib/wsManager", () => ({
  getWebSocketManager: jest.fn(() => ({ broadcastLessonStatusUpdate: jest.fn() })),
}));

// Cron
jest.mock("node-cron", () => ({ schedule: jest.fn() }));
```

## Error Testing

```typescript
it("should throw when end time is before start", async () => {
  await expect(createLesson({ startTime: new Date(), endTime: new Date(Date.now() - 3600000) }))
    .rejects.toThrow("Время окончания должно быть позже времени начала");
});
```
