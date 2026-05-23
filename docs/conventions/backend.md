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

| Type       | Pattern                   | Location                |
| ---------- | ------------------------- | ----------------------- |
| Routes     | `[domain].ts`             | `routes/`               |
| Controller | `[domain]/index.ts`       | `controllers/`          |
| Validators | `validators.ts`           | `controllers/[domain]/` |
| Services   | `[domain]/index.ts`       | `services/`             |
| Service constants | `[domain].constants.ts` | `services/[domain]/` |
| Service helpers | `[domain].helpers.ts`   | `services/[domain]/` |
| Service types | `[domain].types.ts`       | `services/[domain]/` |
| Shared types | `[domain].ts` (split) | `types/`                |

**Service files split by responsibility.** Each new service lives in its own
sub-folder. Mixing constants/helpers/types into the entry file is forbidden —
вынеси в соседние `*.constants.ts`/`*.helpers.ts`/`*.types.ts`. Старые "плоские"
сервисы (`admin.ts`, `backup.ts`, …) приводим к этой структуре оппортунистически,
когда трогаем их по другой причине.

**Shared types are split by domain.** Не складывать всё в один `types/index.ts` —
разнести по `types/auth.ts`, `types/student.ts`, `types/lesson.ts` и т. п.,
а `types/index.ts` оставить barrel'ом из `export type`.

**Errors are extracted.** Кастомные классы ошибок сервисов — в общем
`src/utils/errors.ts`, не плодим `class FooError extends Error` в каждом
сервисе (см. memory: "Centralize custom Error classes").

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

## Custom Error Classes

Custom `Error` subclasses used for `instanceof` flow control (e.g. mapping a
domain exception to an HTTP status) **must** live in `src/utils/errors.ts`
and be re-exported via `src/utils/index.ts`. Do **not** declare them locally
inside controllers/services — local declarations duplicate types and make
the error surface invisible to other modules.

```typescript
// ❌ Bad — local declaration inside the controller
class SchedulingConflictError extends Error {}

// ✅ Good — central declaration
// src/utils/errors.ts
export class SchedulingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulingConflictError";
  }
}

// consumer
import { SchedulingConflictError } from "../../utils";
```

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

### Изолированные подсистемы аутентификации

Когда фича добавляет новый тип пользователя, аккаунты которого должны быть физически изолированы от существующих (`User` — преподаватели, `Admin` — отдельная аутентификация), используем тот же паттерн, что для роли "ученик" (см. `specs/029-student-cabinet`):

1. **Отдельная таблица в Prisma** (`student_users`, `admin_users` и т. п.) с собственными полями. Не вводить generic `role`-колонку в `users`
2. **Отдельный JWT-секрет** в `.env` (например, `STUDENT_JWT_SECRET`) + helper'ы в `utils/<role>Auth.ts` (`generateXToken`, `verifyXToken`). Payload содержит дискриминатор (`isStudent: true`, `isAdmin: true`) для двойной проверки в `verify`
3. **Отдельный middleware** `middleware/<role>Auth.ts` (`authenticateStudent`) — кладёт payload в свой ключ на `req` (`req.studentUser`, `req.admin`). Существующий `authenticateToken` не модифицировать
4. **Отдельный namespace роутов** (`/api/student-auth/*`, `/api/student-cabinet/*`) — токены физически не пересекаются с tutor-эндпоинтами
5. **Отдельные rate-limiters** для login/register/resend, чтобы не было общего бюджета попыток с другими ролями
6. **WebSocket**: добавлять отдельный путь (`/ws/student?token=...`) в общем `WebSocketManager`, со своим пулом клиентов и auth-функцией. Не пересекать пулы — broadcast в один пул не должен видеть клиентов другого
7. **Cross-role security регрессионные тесты** обязательны: tutor JWT отвергается student-эндпоинтами и наоборот; см. `src/__tests__/cross-role-security.test.ts` как пример
8. **Раздельные хранилища токенов на фронте** (например, ключ `studentToken` vs `authToken` в `localStorage`) и отдельный axios-инстанс (`shared/api/studentBase.ts` — `studentApi`/`publicApi`)
9. **Раздельные route guards** на фронте — каждый guard проверяет только "свою" сессию из `entities/<role>`

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
- **Minimal comments — default zero.** Перед написанием комментария спросить себя: «без него читатель ошибётся / потеряет важный контекст?» Если нет — удалить. Не писать «// эта функция делает X», «// Routes», «// Middleware», «// Validate input», «Регрессия #N» — имена/структура и git blame уже это говорят. Оставлять только: скрытые инварианты, обходы багов (с источником), неинтуитивные side-effects, спорные «почему именно так». Это применяется и к тестам — описательное `it("...")` уже даёт контекст
- Always wrap controllers in try-catch
- Return early for error cases
- Use `truncateToMinute()` for lesson times
