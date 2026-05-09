# API Contracts: Восстановление пароля

**Feature Branch**: `028-forgot-password`
**Date**: 2026-05-09
**Base Path**: `/api/auth`

Все три эндпоинта **публичные** (без `authenticateToken`), но с разной защитой:
- `/forgot-password` — за per-IP rate-limit middleware (`passwordResetRateLimiter`)
- `/reset-password/verify` и `/reset-password` — без middleware (входной токен сам по себе обеспечивает энтропию; при желании — общий `authRateLimiter` для базовой защиты)

---

## POST /api/auth/forgot-password

Запрос на восстановление пароля. **Не раскрывает существование email** — всегда 200 при валидном формате запроса.

**Auth**: Public (no token)
**Rate limit**: per-IP, 5 запросов / 15 минут (`passwordResetRateLimiter`)

### Request

```json
{
  "email": "string (required, valid email format)"
}
```

### Responses

**200 OK** — Запрос принят (независимо от существования email)

```json
{
  "message": "Если адрес зарегистрирован, мы отправили на него письмо со ссылкой для сброса пароля"
}
```

**400 Bad Request** — Неверный формат email (валидация на уровне DTO)

```json
{ "error": "Email обязателен" }
{ "error": "Некорректный формат email" }
```

**429 Too Many Requests** — Превышен per-IP rate-limit (формат от `express-rate-limit`)

```json
{ "error": "Слишком много попыток. Попробуйте позже" }
```

**500 Internal Server Error** — Серверная ошибка (например, ошибка БД до отправки письма)

```json
{ "error": "Ошибка при запросе восстановления пароля" }
```

#### Поведение по cooldown

Если для существующего пользователя последний `PasswordResetToken` создан **меньше 60 секунд назад**, новый токен НЕ создаётся и письмо НЕ отправляется. Ответ — тот же `200 OK` (для защиты от энумерации). Логируется для мониторинга.

---

## POST /api/auth/reset-password/verify

Проверка валидности токена сброса. Используется фронтом при загрузке страницы установки нового пароля, чтобы решить — показывать форму или ошибку.

**Auth**: Public (no token, токен сброса проверяется в body)
**Rate limit**: нет (либо общий `authRateLimiter`)

### Request

```json
{
  "token": "string (required, base64url-encoded reset token)"
}
```

### Responses

**200 OK** — Токен валиден

```json
{
  "valid": true
}
```

**400 Bad Request** — Токен невалиден / истёк / уже использован

```json
{ "error": "Токен обязателен" }
{ "error": "Ссылка для сброса пароля недействительна" }
{ "error": "Срок действия ссылки истёк. Запросите новую" }
{ "error": "Эта ссылка уже была использована. Запросите новую" }
```

**500 Internal Server Error**

```json
{ "error": "Внутренняя ошибка сервера" }
```

---

## POST /api/auth/reset-password

Применение нового пароля по валидному токену сброса. Атомарная операция: токен погашается и пароль обновляется в одной транзакции.

**Auth**: Public (no token, токен сброса проверяется в body)
**Rate limit**: нет (либо общий `authRateLimiter`)

### Request

```json
{
  "token": "string (required, base64url-encoded reset token)",
  "newPassword": "string (required, min 8 chars)",
  "confirmPassword": "string (required, must match newPassword)"
}
```

### Responses

**200 OK** — Пароль успешно изменён

```json
{
  "message": "Пароль успешно изменён"
}
```

**400 Bad Request** — Ошибка валидации полей или токена

```json
{ "error": "Все поля обязательны для заполнения" }
{ "error": "Пароли не совпадают" }
{ "error": "Пароль должен содержать минимум 8 символов, заглавные и строчные буквы и цифру" }
{ "error": "Новый пароль должен отличаться от текущего" }
{ "error": "Ссылка для сброса пароля недействительна" }
{ "error": "Срок действия ссылки истёк. Запросите новую" }
{ "error": "Эта ссылка уже была использована. Запросите новую" }
```

**500 Internal Server Error**

```json
{ "error": "Ошибка при смене пароля" }
```

#### Side effects (на 200 OK)

- В БД: `PasswordResetToken.usedAt = NOW()`, `User.password = bcrypt(newPassword)`. Если `User.isEmailVerified` был `false` — становится `true`.
- JWT-токены пользователя на других устройствах **не инвалидируются** (по решению RQ-009 — out of scope).

---

## Summary: New Endpoints

| Method | Endpoint                          | Auth   | Rate-Limit                   | Purpose                                       |
|--------|-----------------------------------|--------|------------------------------|-----------------------------------------------|
| POST   | /api/auth/forgot-password         | Public | per-IP, 5/15min              | Запросить ссылку на сброс пароля              |
| POST   | /api/auth/reset-password/verify   | Public | (опц. authRateLimiter)       | Проверить валидность токена при загрузке формы |
| POST   | /api/auth/reset-password          | Public | (опц. authRateLimiter)       | Установить новый пароль по токену              |

## Frontend integration (`shared/api/auth.ts` additions)

```typescript
forgotPassword: async (data: { email: string }): Promise<{ message: string }> => {
  const response = await api.post("/auth/forgot-password", data);
  return response.data;
},

verifyResetToken: async (data: { token: string }): Promise<{ valid: true }> => {
  const response = await api.post("/auth/reset-password/verify", data);
  return response.data;
},

resetPassword: async (data: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> => {
  const response = await api.post("/auth/reset-password", data);
  return response.data;
},
```

## DTOs (backend `src/types/index.ts` additions)

```typescript
export type ForgotPasswordDto = {
  email: string;
};

export type VerifyResetTokenDto = {
  token: string;
};

export type ResetPasswordDto = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};
```
