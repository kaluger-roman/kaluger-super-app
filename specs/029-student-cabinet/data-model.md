# Phase 1 — Data Model: Личный кабинет ученика (MVP)

**Feature**: 029-student-cabinet
**Date**: 2026-05-10

Изменения в `backend/prisma/schema.prisma`. Все поля и связи описаны декларативно — финальная Prisma-миграция создаётся командой `npm run db:migrate -- --name 029_student_cabinet`.

---

## Новая модель: `StudentUser`

Аккаунт ученика — изолированная таблица, отдельная от `User` (преподавателя).

```prisma
model StudentUser {
  id                     String    @id @default(cuid())
  email                  String    @unique
  password               String
  name                   String

  // Email-верификация — поля единообразны с User, но в своей таблице
  isEmailVerified        Boolean   @default(false)
  verificationCode       String?
  verificationCodeExpiry DateTime?
  verificationCodeSentAt DateTime?
  verificationAttempts   Int       @default(0)

  // Связь со справочной карточкой Student. Nullable — карточка может быть удалена,
  // но аккаунт ученика выживает. Уникально — одна карточка ↔ один аккаунт.
  studentId              String?   @unique
  student                Student?  @relation(fields: [studentId], references: [id], onDelete: SetNull)

  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@index([studentId])
  @@map("student_users")
}
```

### Validation rules

| Поле | Правило |
|------|---------|
| `email` | формат email, нормализация `lowercase + trim`, `@unique` в пределах таблицы |
| `password` | хешируется bcrypt(12) — минимум 8 символов, заглавные и строчные буквы, цифра (общая политика — `utils/passwordPolicy.ts`) |
| `name` | непустая строка после trim, не более 200 символов, без управляющих символов |
| `verificationCode` | 6-значный числовой, генерируется через существующий `generateVerificationCode` |
| `verificationCodeExpiry` | +15 мин от выпуска (`getVerificationCodeExpiry`) |
| `verificationAttempts` | макс. 5 (`MAX_VERIFICATION_ATTEMPTS`) |

### Lifecycle (state)

`StudentUser` создаётся атомарно вместе с погашением `StudentInvitation` (одна транзакция). Удаляется только вручную (out-of-scope для MVP). При удалении/архивации `Student` — `studentId` обнуляется (`SetNull`), но запись остаётся.

---

## Новая модель: `StudentInvitation`

Одноразовая ссылка-приглашение, выпускаемая преподавателем.

```prisma
enum StudentInvitationStatus {
  PENDING
  USED
  REVOKED
}

model StudentInvitation {
  id         String                  @id @default(cuid())
  studentId  String
  student    Student                 @relation(fields: [studentId], references: [id], onDelete: Cascade)

  tutorId    String
  tutor      User                    @relation(fields: [tutorId], references: [id], onDelete: Cascade)

  tokenHash  String                  @unique
  status     StudentInvitationStatus @default(PENDING)

  createdAt  DateTime                @default(now())
  expiresAt  DateTime                // createdAt + 365 дней (см. R-05)
  usedAt     DateTime?
  revokedAt  DateTime?

  @@index([studentId, status])
  @@index([tutorId])
  @@index([expiresAt])
  @@map("student_invitations")
}
```

### Validation rules

| Поле | Правило |
|------|---------|
| `tokenHash` | SHA-256 хеш от raw-токена; raw-токен не хранится. Длина токена — 32 байта (`crypto.randomBytes(32).toString("base64url")`) |
| `status` | конечный автомат, см. ниже |
| `expiresAt` | `createdAt + 365 days` |

### State machine

```text
                   ┌──────────┐
                   │ (создание)│
                   └────┬─────┘
                        ↓
                   ┌─────────┐
       ┌──────────►│ PENDING │◄─────────┐
       │           └────┬────┘          │
       │ (повторная     │               │ (никогда —
       │  выдача        │               │  USED/REVOKED
       │  отзывает      │               │  иммутабельны)
       │  старую)       │               │
       │                ↓               │
   ┌────────┐      ┌────────┐
   │REVOKED │      │  USED  │
   └────────┘      └────────┘
```

- `PENDING → USED`: успешная регистрация ученика — атомарно вместе с созданием `StudentUser`
- `PENDING → REVOKED`: преподаватель сгенерировал новую ссылку для того же `Student` (старая отзывается) **либо** срок жизни вышел и при попытке валидации мы её помечаем `REVOKED` (lazy cleanup)
- `USED`/`REVOKED` — терминальные состояния, не возвращаются в `PENDING`

### Инварианты

- На один `studentId` может быть **не более одной** записи со `status = PENDING` (гарантия — логика сервиса; БД-уровневый `@@unique([studentId])` нельзя, потому что все исторические записи живут в той же таблице)
- Если у `Student` уже есть связанный `StudentUser` → новые `PENDING`-записи **запрещены** (валидация на уровне сервиса)

---

## Изменения в существующей модели: `Student`

```prisma
model Student {
  // … все существующие поля без изменений …

  // Обратная связь — Prisma сама автоматически добавит виртуальное поле:
  studentUser  StudentUser?
  invitations  StudentInvitation[]

  @@map("students")
}
```

**Существующие поля остаются нетронутыми**: ни одного UPDATE-миграции, кроме добавления виртуальных связей.

### Поведение при удалении

- `delete student` → каскадно удаляет `Lesson[]` (как сейчас), каскадно удаляет `StudentInvitation[]` (новое); `StudentUser.studentId` обнуляется (`SetNull`), сам `StudentUser` остаётся

### Поведение при архивации

- `Student.archived = true` (существующее поле) — никаких автоматических действий с `StudentUser` или `StudentInvitation`. Бизнес-логика (см. R-14): новые приглашения архивированному ученику запрещены, но существующие `PENDING` остаются валидны

---

## Изменения в существующей модели: `User` (преподаватель)

Добавляется только обратная связь к `StudentInvitation` (для запросов "сколько приглашений я выдал" и аналитики).

```prisma
model User {
  // … все существующие поля без изменений …

  studentInvitations StudentInvitation[]

  @@map("users")
}
```

**Никаких новых полей.** Никакого `role`. `User` остаётся таблицей преподавателей.

---

## Изменения в существующей модели: `Lesson`

**Без изменений.** `Lesson.studentId` уже существует и связан с `Student`. Ученик читает свои уроки через цепочку:

```text
StudentUser → Student → Lesson[]   (фильтр по неделе на уровне query)
```

Если `Student` удалён → `StudentUser.studentId === null`, и `Lesson[]` ученика — пустой массив.

---

## Сводка миграции

```sql
-- Файл: prisma/migrations/<timestamp>_029_student_cabinet/migration.sql
-- (генерируется Prisma; псевдо-SQL для понимания)

CREATE TYPE "StudentInvitationStatus" AS ENUM ('PENDING', 'USED', 'REVOKED');

CREATE TABLE "student_users" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  "verificationCode" TEXT,
  "verificationCodeExpiry" TIMESTAMP,
  "verificationCodeSentAt" TIMESTAMP,
  "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
  "studentId" TEXT UNIQUE REFERENCES "students"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE INDEX "student_users_studentId_idx" ON "student_users"("studentId");

CREATE TABLE "student_invitations" (
  "id" TEXT PRIMARY KEY DEFAULT (cuid()),
  "studentId" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "tutorId"   TEXT NOT NULL REFERENCES "users"("id")    ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "status" "StudentInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt"    TIMESTAMP,
  "revokedAt" TIMESTAMP
);

CREATE INDEX "student_invitations_studentId_status_idx" ON "student_invitations"("studentId", "status");
CREATE INDEX "student_invitations_tutorId_idx"          ON "student_invitations"("tutorId");
CREATE INDEX "student_invitations_expiresAt_idx"        ON "student_invitations"("expiresAt");
```

Миграция совместима с существующими данными — существующие `Student`, `User`, `Lesson` записи не модифицируются.

---

## Новые DTO / типы (backend)

```typescript
// backend/src/types/index.ts (дополнения)

export type StudentJwtPayload = {
  studentUserId: string;
  email: string;
  isStudent: true; // дискриминатор, симметрично AdminJwtPayload.isAdmin
};

export type StudentRequest = Request & {
  studentUser?: StudentJwtPayload;
};

export type StudentRegisterByInviteDto = {
  token: string;          // raw-токен из URL
  name: string;           // ФИО
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type StudentLoginDto = {
  email: string;
  password: string;
};

export type StudentSettingsResponse = {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  tutor: {
    name: string;
  } | null; // null если связь прекращена
};

export type StudentLessonResponse = {
  id: string;
  subject: Subject;        // existing enum
  startTime: string;       // ISO
  endTime: string;         // ISO
  status: LessonStatus;    // existing enum
  // НИКАКИХ price, isPaid, paymentDate, notes, homework — для ученика не выдаём
};

export type StudentLessonsByWeekResponse = {
  weekStart: string;       // ISO начало недели (понедельник)
  lessons: StudentLessonResponse[];
};

export type TutorIssueInvitationResponse = {
  inviteUrl: string;       // полный URL для копирования: <FRONT_BASE>/student-invite/<rawToken>
  expiresAt: string;       // ISO
  status: "pending";
};

// Внимание: при чтении статуса (GET) raw-URL НЕ возвращается — он есть только
// в ответе на POST (см. R-16). Если преподаватель потерял URL — нужно "Создать новую",
// которая отзовёт старую и вернёт новый URL.
export type TutorInvitationStatusResponse =
  | { status: "not_issued" }
  | { status: "pending"; createdAt: string; expiresAt: string }
  | { status: "registered"; registeredAt: string; studentEmail: string };

export type ValidateInvitationResponse =
  | { valid: true; studentName: string; tutorName: string }
  | { valid: false };

// WebSocket-сообщения, отправляемые ученику (см. R-09).
// Те же сужения полей, что в StudentLessonResponse —
// никаких price/isPaid/notes/homework.
export type StudentLessonWsEvent =
  | { type: "lesson_created";        lesson: StudentLessonResponse }
  | { type: "lesson_updated";        lesson: StudentLessonResponse }
  | { type: "lesson_deleted";        lessonId: string }
  | { type: "lesson_status_updated"; lessonId: string; status: LessonStatus };
```

---

## Frontend-типы (FSD)

Минимальный набор — чтобы entities/* и features/* могли тип-безопасно общаться.

```typescript
// frontend/src/entities/studentUser/student-user.types.ts
export type StudentSession = {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
};

// frontend/src/entities/studentInvitation/student-invitation.types.ts
export type StudentInvitationStatus =
  | "not_issued"
  | "pending"
  | "registered";

// pending без inviteUrl — URL хранится только в ephemeral-сторе
// features/tutorStudentInvitation на момент только что выпущенной ссылки
// (см. R-16).
export type StudentInvitationView =
  | { status: "not_issued" }
  | { status: "pending"; createdAt: string; expiresAt: string }
  | { status: "registered"; registeredAt: string; studentEmail: string };

// frontend/src/entities/lesson/student-lesson.types.ts
export type StudentVisibleLesson = {
  id: string;
  subject: Subject;       // shared enum
  startTime: string;
  endTime: string;
  status: LessonStatus;   // shared enum
};
```

---

## Связь с FR из спеки

| Entity / поле | Покрывает FR |
|--------------|--------------|
| `StudentUser` (вся таблица) | FR-017, FR-018, FR-019, FR-020, FR-020a |
| `StudentUser.email @unique` | FR-011a |
| `StudentUser.password` (bcrypt) | FR-011, FR-015 (хеш), безопасность |
| `StudentUser.isEmailVerified`, `verificationCode*` | FR-013a, FR-023 (баннер) |
| `StudentUser.studentId @unique` | FR-001 (один аккаунт на карточку), FR-024 (читаем tutor через связь) |
| `StudentUser.studentId` SetNull | FR-020a (аккаунт переживает удаление карточки) |
| `StudentInvitation.tokenHash @unique` | FR-002, FR-015 |
| `StudentInvitation.status PENDING/USED/REVOKED` | FR-003, FR-004, FR-014, FR-016 |
| Один PENDING на studentId | FR-004 (новая ссылка отзывает старую) |
| `Запрет PENDING если есть StudentUser` | FR-001, FR-004, FR-004a |
| `expiresAt = +365d` | FR-006 |
| `Cascade delete invitations on Student delete` | Edge case "карточка удалена → ссылка недействительна" |
| `StudentLessonWsEvent` (4 типа) | FR-031a, SC-010 — realtime-обновления расписания |
