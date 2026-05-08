# Quickstart: Смена пароля и email

**Feature Branch**: `023-change-password-email`
**Date**: 2026-02-24

## Prerequisites

- Node.js 20+
- PostgreSQL запущен
- Backend и frontend зависимости установлены (`npm install` в обеих директориях)
- Prisma клиент сгенерирован (`npm run db:generate` в `backend/`)

## Setup

### 1. Миграция базы данных

```bash
cd backend
npm run db:migrate
```

Миграция добавит поле `pendingEmail` в таблицу `users`.

### 2. Запуск dev-серверов

```bash
# Терминал 1 — backend
cd backend
npm run dev

# Терминал 2 — frontend
cd frontend
npm start
```

## Verification Checklist

### Смена пароля

1. Войти в приложение
2. Перейти в профиль (`/profile`)
3. Найти секцию «Смена пароля»
4. Ввести текущий пароль, новый пароль, подтверждение
5. Нажать «Сменить пароль»
6. Убедиться в уведомлении об успехе
7. Выйти и войти с новым паролем

### Смена email

1. Войти в приложение
2. Перейти в профиль (`/profile`)
3. Найти секцию «Смена email»
4. Ввести новый email и текущий пароль
5. Нажать «Сменить email»
6. Проверить почту на новом адресе — получить код
7. Ввести 6-значный код
8. Убедиться в обновлённом email в профиле
9. Выйти и войти с новым email

## New Files Overview

### Backend

| File                                      | Description                          |
|-------------------------------------------|--------------------------------------|
| `src/controllers/changePassword.ts`       | Контроллер смены пароля              |
| `src/controllers/changeEmail.ts`          | Контроллер смены email               |
| `src/services/changePassword.ts`          | Сервис смены пароля                  |
| `src/services/changeEmail.ts`             | Сервис смены email                   |
| `src/types/index.ts`                      | Новые DTO (дополнение)               |
| `src/routes/auth.ts`                      | Новые роуты (дополнение)             |

### Frontend

| File                                                        | Description                        |
|-------------------------------------------------------------|------------------------------------|
| `src/features/changePassword/`                              | Feature: модель + UI               |
| `src/features/changeEmail/`                                 | Feature: модель + UI               |
| `src/shared/api/auth.ts`                                    | Новые API-методы (дополнение)      |
| `src/pages/profile/ProfilePage.tsx`                         | Интеграция новых секций            |

### Database

| File                              | Description                                   |
|-----------------------------------|-----------------------------------------------|
| `prisma/schema.prisma`           | Поле `pendingEmail` в модели User              |
| `prisma/migrations/...`          | Миграция для `pendingEmail`                    |
