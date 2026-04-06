# Data Model: Смена пароля и email

**Feature Branch**: `023-change-password-email`
**Date**: 2026-02-24

## Entity Changes

### User (existing entity — modification)

**New field:**

| Field        | Type     | Nullable | Default | Description                                         |
|--------------|----------|----------|---------|-----------------------------------------------------|
| pendingEmail | String   | Yes      | null    | Новый email, ожидающий верификации кода              |

**Reused fields (already exist):**

| Field                  | Type      | Usage in this feature                                   |
|------------------------|-----------|---------------------------------------------------------|
| email                  | String    | Текущий email; обновляется после верификации нового      |
| password               | String    | Хэш пароля; обновляется при смене пароля                |
| verificationCode       | String?   | 6-значный код для подтверждения нового email             |
| verificationCodeExpiry | DateTime? | Срок действия кода (15 минут)                            |
| isEmailVerified        | Boolean   | Остаётся true при смене email (пользователь уже верифицирован) |

### Prisma Schema Change

```prisma
model User {
  id                     String    @id @default(cuid())
  email                  String    @unique
  password               String
  name                   String
  isEmailVerified        Boolean   @default(false)
  verificationCode       String?
  verificationCodeExpiry DateTime?
  pendingEmail           String?                          // NEW
  taxRate                Float     @default(6.0)
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  students       Student[]
  lessons        Lesson[]
  newsReadStatus NewsReadStatus?

  @@map("users")
}
```

## State Transitions

### Change Password Flow

```
User.password (current hash)
  → Verify current password (bcrypt.compare)
  → Validate new password (regex)
  → Check new ≠ current (bcrypt.compare)
  → Hash new password (bcrypt, 12 rounds)
  → User.password = new hash
```

No other fields change. JWT remains valid.

### Change Email Flow

```
Step 1: Initiate
  → Verify current password (bcrypt.compare)
  → Validate new email (regex + unique check)
  → Check new ≠ current email
  → User.pendingEmail = newEmail
  → User.verificationCode = 6-digit code
  → User.verificationCodeExpiry = now + 15 min
  → Send verification email to newEmail

Step 2: Verify
  → Check verificationCode matches
  → Check verificationCodeExpiry not expired
  → User.email = User.pendingEmail
  → User.pendingEmail = null
  → User.verificationCode = null
  → User.verificationCodeExpiry = null
  → Generate new JWT with updated email
  → Return new token + updated user
```

## Validation Rules

### Password

| Rule           | Constraint                                    |
|----------------|-----------------------------------------------|
| Min length     | 8 characters                                  |
| Uppercase      | At least 1 uppercase letter                   |
| Lowercase      | At least 1 lowercase letter                   |
| Digit          | At least 1 digit                              |
| Allowed chars  | `a-zA-Z0-9@$!%*?&`                            |
| Regex          | `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/` |

### Email

| Rule           | Constraint                                    |
|----------------|-----------------------------------------------|
| Format         | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`               |
| Uniqueness     | No other user with same email in database     |

### Verification Code

| Rule           | Constraint                                    |
|----------------|-----------------------------------------------|
| Format         | 6 digits (100000–999999)                      |
| Expiry         | 15 minutes from generation                    |
| Resend cooldown| 60 seconds between resend requests            |
