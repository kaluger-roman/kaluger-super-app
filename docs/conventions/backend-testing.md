# Backend Testing Conventions

Stack: Jest + Supertest + Faker + test database

## Rules

- **Do NOT mock Prisma** — use separate test database (ESLint enforced: `no-restricted-syntax` rejects `jest.mock("…prisma…")`)
- **Clean up after tests** — delete created records
- **Tests must be independent** — no shared state between tests
- **Module state resets live in `src/__tests__/setup.ts`** — an in-memory registry or cache gets an `__reset…ForTests()` export next to it, called from the global `beforeEach` in `setup.ts`; never re-export it from a barrel (`index.ts`), and never add a parameter or default to production code only so a test can inject something (mock the module, e.g. `lib/wsManager`, instead)
- **Always async/await** — never `done` callbacks (ESLint `jest/no-done-callback`); wrap callback APIs in a promise: `await new Promise<void>((resolve) => server.close(() => resolve()))`
- **No `.only` / `.skip` in committed tests** (ESLint `jest/no-focused-tests`, `jest/no-disabled-tests`)
- **Test edge cases** — invalid input, empty arrays, null values
- **No `export default`** — only named exports/imports
- **No TypeScript errors** — run `npx tsc --noEmit` and fix all errors before finishing
- **No ESLint errors** — run lint and fix all errors before finishing

## Parallel-Safe Tests

Jest runs files in parallel workers against one shared test database, so a test may only see and change its own rows.

- **Test database** — `src/__tests__/loadTestEnv.ts` (jest `setupFiles`) loads `backend/.env.test` with `override`, so a local run never falls back to `backend/.env` (the dev database). Keep env loading there: anything in `setup.ts` runs after the Prisma client is required
- **Emails** — `uniqueEmail()` from `src/__tests__/helpers`, never `faker.internet.email()`: `User.email` and `StudentUser.email` are globally unique and faker collides across a parallel run
- **Global cron services** (`processRecurringLessons`, `updateLessonStatuses`, `processScheduledReminders`) — always pass `{ tutorIds: [userId] }` (`CronScope`). Unscoped they process every tutor and mutate other files' data
- **Global singleton rows and tables** (`backup_settings`, `admin_alerts` / `admin_settings`) — serialize through `acquireGlobalTestLock(GLOBAL_TEST_LOCK.X)` in the top `beforeAll` (timeout `GLOBAL_TEST_LOCK_TIMEOUT_MS`) and call the returned release in `afterAll`. Add a new key to `GLOBAL_TEST_LOCK` for a new shared table
- **Time** — statistics fixtures pass an explicit `startDate`/`endDate` instead of relying on the default current month; minute-sensitive tests truncate `now` to the minute; wait for async side effects by polling with a deadline, not a fixed `setTimeout`
- **Don't rerun a failure** — a red test is a bug in the code or the test; find the shared state or time dependency

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
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { uniqueEmail } from "../../../__tests__/helpers";

describe("POST /api/students", () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), password: "hash", name: "Test" },
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
