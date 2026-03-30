# Backend Conventions

Stack: Express + TypeScript + Prisma + WebSocket

## Structure

```
backend/
├─ prisma/
│  ├─ schema.prisma      # Database schema
│  └─ migrations/        # Migration history
├─ src/
│  ├─ index.ts           # Entry point, middleware, cron jobs
│  ├─ routes/            # Route definitions
│  ├─ controllers/       # Request handlers + validators
│  ├─ services/          # Business logic
│  ├─ middleware/        # Auth, error handling
│  ├─ lib/               # Prisma client, integrations
│  ├─ utils/             # Helper functions
│  └─ types/             # Type definitions
```

**Flow:** `Routes → Controllers → Services → Prisma → Database`

## File Organization

| Type       | Pattern             | Location                |
| ---------- | ------------------- | ----------------------- |
| Routes     | `[domain].ts`       | `routes/`               |
| Controller | `[domain]/index.ts` | `controllers/`          |
| Validators | `validators.ts`     | `controllers/[domain]/` |
| Services   | `[domain].ts`       | `services/`             |
| Types      | `index.ts`          | `types/`                |

**Only standard `.ts` files.** No custom extensions like `.utils.ts`, `.data.ts`, etc.

**Every folder must have `index.ts`** — re-export all public API needed from that folder.

**No deep imports** — each folder exposes everything via index, max 1 level deep:

```typescript
// ✅ Good
import { createStudent } from "./controllers";

// ❌ Bad
import { createStudent } from "./controllers/students/createStudent";
```

## Strict Rules

### Structure

- **Controllers < 150 lines** — extract to services
- **Complex actions (50+ lines)** — separate file

### Types

- **Types in `src/types/index.ts`** — centralized
- **Use `type`**, not `interface`
- **Use Prisma-generated types** — don't duplicate
- **No `any`** — use `unknown`

### Code Quality

- **Named exports only** — no `export default`
- **Function expressions only** — use `const fn = () => {}`, not `function fn() {}`
- **Error messages in Russian**
- **No ESLint errors** — run lint and fix all errors before finishing
- **No TypeScript errors** — run `npx tsc --noEmit` and fix all errors before finishing

## Layer Responsibilities

| Layer       | Does                                           | Doesn't             |
| ----------- | ---------------------------------------------- | -------------------- |
| Controllers | HTTP concerns, validation, response formatting | Business logic       |
| Services    | Business logic, complex operations             | HTTP concerns        |
| Utils       | Pure functions, helpers                         | State, side effects  |

## Patterns

**Auth:** JWT in `Authorization: Bearer <token>`, validated by `middleware/auth.ts`, user in `req.user`

**Transactions:**

```typescript
await prisma.$transaction(async (tx) => {
  await tx.lesson.create({ data });
  await tx.student.update({ where: { id }, data });
});
```

**Prisma types:**

```typescript
import { Prisma } from "@prisma/client";
type StudentWithLessons = Prisma.StudentGetPayload<{
  include: { lessons: true };
}>;
```

**AuthRequest:**

```typescript
type AuthRequest = Request & { user?: JwtPayload };
```

## New Feature Checklist

1. Define types in `src/types/index.ts`
2. Create controller in `src/controllers/[feature]/`
3. Add validators in `controllers/[feature]/validators.ts`
4. Define routes in `src/routes/[feature].ts`
5. Register routes in `src/index.ts`
6. Add service if complex logic needed
7. Update Prisma schema if new entities

## Timezone Handling

All dates in DB are UTC. User's timezone arrives via `X-Timezone` header (IANA string, e.g. `Europe/Moscow`), set automatically by frontend on every request. Middleware in `auth.ts` silently saves it to `User.timezone`.

**Rules:**

- **Never use server local time for user-facing logic** — `new Date()` is fine for UTC comparisons (status updates, cron), but not for computing "user's today/month"
- **Default date ranges** (when no explicit dates from frontend) — use `getCurrentMonthRange(timezone)` / `getLastMonthBounds(timezone)` from `utils/time.ts`
- **Explicit date ranges from frontend** — frontend already converts to UTC boundaries via `toLocalStartOfDay`/`toLocalEndOfDay`, just parse with `new Date(isoString)`
- **Extract timezone in controllers:** `const timezone = req.headers["x-timezone"] as string | undefined`
- **Push notifications** — format times using stored `user.timezone` via `Intl.DateTimeFormat({ timeZone })`
- **Timezone-aware boundaries** — use `startOfMonthInTimezone()` / `endOfMonthInTimezone()` from `utils/time.ts` when computing month boundaries on the server

## Code Style

- Extract functions only if reused 2+ times
- Minimal comments — only for non-obvious logic
- Always wrap controllers in try-catch
- Return early for error cases
- Use `truncateToMinute()` for lesson times
