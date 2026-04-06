# Data Model: Admin Panel

## Нет новых моделей Prisma

Админ-панель не требует новых таблиц. Админ аутентифицируется через ENV-переменные. `BackupSettings` уже существует.

## ENV-переменные

| Переменная | Тип | Описание |
|------------|-----|----------|
| `ADMIN_EMAIL` | string | Email для входа в админку |
| `ADMIN_PASSWORD` | string | Bcrypt hash пароля админа |

## JWT Payload (админ)

```typescript
type AdminJwtPayload = {
  email: string;
  isAdmin: true;
};
```

Время жизни токена: 24 часа (короче чем пользовательский — 7 дней).

## Используемые существующие модели (read-only)

- `User` — count для обзора
- `Student` — count для обзора
- `Lesson` — count для обзора
- `BackupSettings` — CRUD для управления бэкапами

## Response Types

### AdminOverviewResponse

```typescript
type AdminOverviewResponse = {
  usersCount: number;
  studentsCount: number;
  lessonsCount: number;
  serverUptime: number; // секунды
};
```

### AdminLoginResponse

```typescript
type AdminLoginResponse = {
  token: string;
};
```
