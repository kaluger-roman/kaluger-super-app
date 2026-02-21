# Email Verification API Documentation

## Обзор

Система подтверждения email при регистрации. После регистрации пользователь получает 6-значный код на email, который действителен 15 минут.

## Endpoints

### 1. POST `/api/auth/register`

Регистрация нового пользователя с отправкой кода подтверждения на email.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response (201):**

```json
{
  "message": "Пользователь успешно создан. Проверьте email для подтверждения регистрации",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": false
  }
}
```

**Ошибки:**

- `400` - Неверный формат email или пароль не соответствует требованиям
- `409` - Пользователь уже существует
- `500` - Внутренняя ошибка сервера

---

### 2. POST `/api/auth/verify-email`

Подтверждение email по коду из письма.

**Request Body:**

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**

```json
{
  "message": "Email успешно подтвержден",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": true
  }
}
```

**Ошибки:**

- `400` - Email и код обязательны / Email уже подтвержден / Неверный код / Срок действия кода истек
- `404` - Пользователь не найден
- `500` - Внутренняя ошибка сервера

---

### 3. POST `/api/auth/resend-verification`

Повторная отправка кода подтверждения.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "message": "Код подтверждения отправлен на email"
}
```

**Ошибки:**

- `400` - Email обязателен / Email уже подтвержден
- `404` - Пользователь не найден
- `500` - Ошибка отправки письма / Внутренняя ошибка сервера

---

### 4. POST `/api/auth/login`

Вход в систему. Требует подтвержденный email.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**

```json
{
  "message": "Вход выполнен успешно",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Ошибки:**

- `400` - Email и пароль обязательны
- `401` - Неверные учетные данные
- `403` - Email не подтвержден
- `500` - Внутренняя ошибка сервера

---

## Workflow регистрации

1. **Регистрация**: `POST /api/auth/register`
   - Создается пользователь с `isEmailVerified: false`
   - Генерируется 6-значный код
   - Код отправляется на email
   - Код действителен 15 минут

2. **Подтверждение**: `POST /api/auth/verify-email`
   - Проверяется код
   - Проверяется срок действия
   - Устанавливается `isEmailVerified: true`
   - Возвращается JWT токен

3. **Повторная отправка** (при необходимости): `POST /api/auth/resend-verification`
   - Генерируется новый код
   - Старый код инвалидируется
   - Отправляется новое письмо

4. **Вход**: `POST /api/auth/login`
   - Проверяется `isEmailVerified: true`
   - При успехе возвращается JWT токен

---

## Настройка Resend

Добавьте в `.env` файл:

```env
RESEND_API_KEY="re_your_api_key_here"
EMAIL_FROM="onboarding@resend.dev"
```

### Получение API ключа:

1. Зарегистрируйтесь на https://resend.com
2. Создайте API ключ в разделе API Keys
3. Добавьте и верифицируйте домен в разделе Domains (или используйте тестовый `onboarding@resend.dev`)
4. Используйте формат `from`: `Name <email@yourdomain.com>` или просто `email@yourdomain.com`

**Важно**: В режиме разработки письма отправляются только на email, указанный при регистрации в Resend. Для отправки на любые адреса подключите и верифицируйте свой домен.

---

## Безопасность

- Коды действительны только 15 минут
- Коды удаляются после успешной верификации
- При повторной отправке старый код заменяется новым
- Вход запрещен без подтвержденного email
- Все пароли хешируются bcrypt
