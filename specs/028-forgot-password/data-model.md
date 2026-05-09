# Data Model: Восстановление пароля

**Feature Branch**: `028-forgot-password`
**Date**: 2026-05-09

## Entity Changes

### PasswordResetToken (new entity)

Одноразовый токен сброса пароля. Каждый запрос восстановления создаёт новую запись. При новом запросе для того же пользователя — старые неиспользованные записи помечаются `usedAt = now`, чтобы инвалидировать их (FR-011).

| Field      | Type      | Nullable | Default       | Description                                                  |
|------------|-----------|----------|---------------|--------------------------------------------------------------|
| id         | String    | No       | `cuid()`      | Первичный ключ                                                |
| userId     | String    | No       | —             | FK на `User.id`                                               |
| tokenHash  | String    | No       | —             | SHA-256 хеш plain-токена (sha256(token).hex). Unique-индекс  |
| expiresAt  | DateTime  | No       | —             | Срок действия (15 минут от создания)                          |
| usedAt     | DateTime? | Yes      | null          | Время погашения. `null` = ещё не использован                 |
| createdAt  | DateTime  | No       | `now()`       | Время выпуска                                                 |

**Indexes**:
- `tokenHash` (unique) — для быстрого lookup при проверке/применении
- `userId` — для инвалидации старых токенов одного пользователя
- `expiresAt` — для периодической очистки протухших записей (опционально, через cron — вне MVP)

**Relations**:
- `user` belongs-to `User` (cascade delete: при удалении пользователя удаляются все его токены)

### User (existing entity — modification)

Добавляется обратная связь:

```prisma
passwordResetTokens PasswordResetToken[]
```

Никаких новых полей не нужно — `email`, `password`, `isEmailVerified` уже существуют и переиспользуются. Поля семейства `verificationCode*`/`pendingEmail` НЕ затрагиваются (они для регистрации/смены email).

### Prisma Schema Changes

```prisma
model User {
  id                     String    @id @default(cuid())
  email                  String    @unique
  password               String
  name                   String
  isEmailVerified        Boolean   @default(false)
  verificationCode       String?
  verificationCodeExpiry DateTime?
  verificationCodeSentAt DateTime?
  verificationAttempts   Int       @default(0)
  pendingEmail           String?
  taxEnabled             Boolean   @default(false)
  timezone               String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  students             Student[]
  lessons              Lesson[]
  newsReadStatus       NewsReadStatus?
  pushSubscriptions    PushSubscription[]
  reminderSettings     ReminderSettings?
  scheduledReminders   ScheduledReminder[]
  taxRatePeriods       TaxRatePeriod[]
  passwordResetTokens  PasswordResetToken[]   // NEW

  @@map("users")
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}
```

## State Transitions

### Forgot Password (request) flow

```
POST /api/auth/forgot-password { email }
  → normalize email (lowercase, trim)
  → find User by email
  ├─ user exists:
  │   ├─ check per-email cooldown:
  │   │   └─ есть запись PasswordResetToken для userId за последние 60 сек → 200 (нейтральный ответ), не отправлять
  │   ├─ инвалидировать старые неиспользованные токены: UPDATE password_reset_tokens SET usedAt = NOW() WHERE userId = ? AND usedAt IS NULL
  │   ├─ сгенерировать plain-токен: base64url(crypto.randomBytes(32))
  │   ├─ хешировать: sha256(plainToken).hex
  │   ├─ создать PasswordResetToken { userId, tokenHash, expiresAt: now + 15 min }
  │   └─ отправить письмо: resetUrl = `${FRONTEND_URL}/reset-password?token=${plainToken}`
  ├─ user не существует:
  │   └─ ничего не делать
  └─ всегда → 200 OK с одинаковым нейтральным сообщением
```

### Verify Reset Token flow

```
POST /api/auth/reset-password/verify { token }
  → tokenHash = sha256(token).hex
  → найти PasswordResetToken WHERE tokenHash = ?
  ├─ не найден → 400 (invalid)
  ├─ usedAt !== null → 400 (used)
  ├─ expiresAt < now → 400 (expired)
  └─ valid → 200 OK { valid: true }
```

### Reset Password (apply) flow

```
POST /api/auth/reset-password { token, newPassword, confirmPassword }
  → normalize: проверить newPassword === confirmPassword → 400 если разные
  → tokenHash = sha256(token).hex
  → найти PasswordResetToken WHERE tokenHash = ?
  ├─ не найден / usedAt !== null / expiresAt < now → 400 (invalid)
  └─ valid:
      → load user (PasswordResetToken.userId)
      → validatePassword(newPassword) → 400 если не соответствует регэкспу
      → comparePassword(newPassword, user.password) → если совпадает → 400 "новый пароль должен отличаться"
      → транзакция:
          → UPDATE PasswordResetToken SET usedAt = NOW() WHERE id = ?
          → UPDATE User SET password = bcrypt(newPassword), isEmailVerified = TRUE WHERE id = ?
              (isEmailVerified выставляется в true только если был false — экономит запись, но опционально)
      → 200 OK { message: "Пароль успешно изменён" }
```

JWT-токены пользователя НЕ инвалидируются (см. RQ-009 в research).

## Validation Rules

### Email (request flow)

| Rule         | Constraint                                        |
|--------------|---------------------------------------------------|
| Required     | Поле обязательно (но при пустом — 400 *валидации*, всё равно нет утечки факта существования) |
| Format       | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (как и в существующих местах) |
| Normalization| trim + lowercase перед поиском                    |

### Token (verify/apply flow)

| Rule       | Constraint                                                                   |
|------------|------------------------------------------------------------------------------|
| Format     | непустая строка, ожидается base64url без padding, длина соответствует 32 байтам сырых данных |
| Lookup     | сравнение по `tokenHash = sha256(plain).hex`, unique-индекс                  |
| Validity   | `usedAt IS NULL AND expiresAt > NOW()`                                       |

### Password (apply flow)

Те же правила, что и в `services/changePassword.ts`:

| Rule           | Constraint                                                |
|----------------|-----------------------------------------------------------|
| Min length     | 8 символов                                                 |
| Uppercase      | ≥ 1 заглавная буква                                       |
| Lowercase      | ≥ 1 строчная буква                                         |
| Digit          | ≥ 1 цифра                                                 |
| Allowed chars  | `a-zA-Z0-9@$!%*?&`                                        |
| Regex          | `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/`  |
| Difference     | Должен отличаться от текущего (`!comparePassword(new, user.password)`) |
| Confirm match  | `newPassword === confirmPassword`                         |

## Cleanup Strategy

Записи `PasswordResetToken` со временем накапливаются. Стратегия (вне MVP):

- Токены с `expiresAt < NOW() - 7 days` могут быть удалены фоновым cron'ом (можно добавить позже в `services/recurringLessons.ts`-стиле).
- Для MVP — оставляем как есть; объём небольшой (один пользователь, ~один запрос в месяц).
- В случае необходимости миграции под нагрузкой — индекс `expiresAt` уже есть, удаление быстрое.

## Migration Plan

```bash
cd backend
npx prisma migrate dev --name add_password_reset_tokens
```

Generated migration applies:

1. `CREATE TABLE password_reset_tokens` со всеми полями и индексами;
2. FK `userId` → `users.id` ON DELETE CASCADE.

Rollback: `npx prisma migrate resolve --rolled-back <migration_name>` + ручное удаление таблицы (Prisma не генерирует `down` SQL, но миграция несложная).

Производительность: миграция мгновенная (создание новой пустой таблицы).
