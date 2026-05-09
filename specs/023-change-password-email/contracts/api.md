# API Contracts: Смена пароля и email

**Feature Branch**: `023-change-password-email`
**Date**: 2026-02-24
**Base Path**: `/api/auth`

---

## POST /api/auth/change-password

Смена пароля авторизованного пользователя.

**Auth**: Required (Bearer JWT)

### Request

```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required)",
  "confirmPassword": "string (required)"
}
```

### Responses

**200 OK** — пароль успешно изменён

```json
{
  "message": "Пароль успешно изменён"
}
```

**400 Bad Request** — ошибка валидации

```json
{ "error": "Все поля обязательны для заполнения" }
{ "error": "Пароли не совпадают" }
{ "error": "Пароль должен содержать минимум 8 символов, заглавные и строчные буквы и цифру" }
{ "error": "Новый пароль должен отличаться от текущего" }
```

**401 Unauthorized** — неверный текущий пароль

```json
{ "error": "Неверный текущий пароль" }
```

**404 Not Found** — пользователь не найден

```json
{ "error": "Пользователь не найден" }
```

**500 Internal Server Error**

```json
{ "error": "Ошибка при смене пароля" }
```

---

## POST /api/auth/change-email

Инициирование смены email. Отправляет код верификации на новый адрес.

**Auth**: Required (Bearer JWT)

### Request

```json
{
  "newEmail": "string (required)",
  "password": "string (required)"
}
```

### Responses

**200 OK** — код верификации отправлен

```json
{
  "message": "Код верификации отправлен на новый email"
}
```

**400 Bad Request** — ошибка валидации

```json
{ "error": "Все поля обязательны для заполнения" }
{ "error": "Некорректный формат email" }
{ "error": "Новый email должен отличаться от текущего" }
```

**401 Unauthorized** — неверный пароль

```json
{ "error": "Неверный пароль" }
```

**404 Not Found** — пользователь не найден

```json
{ "error": "Пользователь не найден" }
```

**409 Conflict** — email уже занят

```json
{ "error": "Этот email уже используется" }
```

**500 Internal Server Error**

```json
{ "error": "Ошибка при инициировании смены email" }
```

---

## POST /api/auth/verify-email-change

Подтверждение смены email через код верификации.

**Auth**: Required (Bearer JWT)

### Request

```json
{
  "code": "string (required, 6 digits)"
}
```

### Responses

**200 OK** — email успешно изменён

```json
{
  "message": "Email успешно изменён",
  "token": "new-jwt-token",
  "user": {
    "id": "string",
    "email": "string (new email)",
    "name": "string",
    "createdAt": "string (ISO 8601)",
    "isEmailVerified": true,
    "taxRate": 6.0
  }
}
```

**400 Bad Request** — ошибка валидации

```json
{ "error": "Код верификации обязателен" }
{ "error": "Неверный код верификации" }
{ "error": "Срок действия кода верификации истёк" }
{ "error": "Нет запроса на смену email" }
```

**404 Not Found** — пользователь не найден

```json
{ "error": "Пользователь не найден" }
```

**409 Conflict** — email уже занят (другой пользователь занял за время верификации)

```json
{ "error": "Этот email уже используется" }
```

**500 Internal Server Error**

```json
{ "error": "Ошибка при подтверждении смены email" }
```

---

## POST /api/auth/resend-email-change-code

Повторная отправка кода верификации для смены email.

**Auth**: Required (Bearer JWT)

### Request

```json
{}
```

(Пустое тело — pendingEmail берётся из профиля пользователя)

### Responses

**200 OK** — код отправлен

```json
{
  "message": "Код верификации повторно отправлен"
}
```

**400 Bad Request** — нет активного запроса

```json
{ "error": "Нет запроса на смену email" }
```

**404 Not Found** — пользователь не найден

```json
{ "error": "Пользователь не найден" }
```

**500 Internal Server Error**

```json
{ "error": "Ошибка при отправке кода" }
```

---

## Summary: New Endpoints

| Method | Endpoint                        | Auth     | Purpose                               |
|--------|---------------------------------|----------|---------------------------------------|
| POST   | /api/auth/change-password       | Required | Смена пароля                          |
| POST   | /api/auth/change-email          | Required | Инициирование смены email             |
| POST   | /api/auth/verify-email-change   | Required | Подтверждение смены email кодом       |
| POST   | /api/auth/resend-email-change-code | Required | Повторная отправка кода            |
