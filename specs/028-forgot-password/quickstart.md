# Quickstart: Восстановление пароля

**Feature Branch**: `028-forgot-password`
**Date**: 2026-05-09

## Prerequisites

- Node.js 20+, PostgreSQL запущен
- Backend и frontend зависимости установлены (`npm install` в обеих директориях)
- Prisma-клиент сгенерирован (`npm run db:generate` в `backend/`)
- В `.env` (backend) выставлены: `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`
  - `FRONTEND_URL` — base URL фронта, в письмо подставляется как `${FRONTEND_URL}/reset-password?token=...`
  - dev: `FRONTEND_URL=http://localhost:3000`
  - prod: `FRONTEND_URL=https://tutor.kaluger.ru`

## Setup

### 1. Миграция базы данных

```bash
cd backend
npx prisma migrate dev --name add_password_reset_tokens
npm run db:generate
```

Создаёт таблицу `password_reset_tokens` (см. `data-model.md`) и добавляет связь `User → PasswordResetToken[]`.

### 2. Запуск dev-серверов

```bash
# Терминал 1 — backend
cd backend
npm run dev

# Терминал 2 — frontend
cd frontend
npm start
```

### 3. (опционально) Создать тестового пользователя

```bash
cd backend
npx prisma studio
# или зарегистрироваться через UI и подтвердить email
```

## Verification Checklist

### Сценарий 1 — Запрос восстановления для существующего пользователя

1. Выйти из приложения (если залогинен).
2. Открыть `/login`. Под полями убедиться, что есть ссылка **"Забыли пароль?"**.
3. Кликнуть — оказаться на `/forgot-password`.
4. Ввести email существующего пользователя, нажать **"Отправить"**.
5. Увидеть нейтральное сообщение об отправке.
6. Открыть Resend dashboard / inbox: получено письмо с темой про восстановление пароля и ссылкой.
7. В URL ссылки — `${FRONTEND_URL}/reset-password?token=<длинный токен>`.
8. Перейти по ссылке — открывается страница ввода нового пароля.

### Сценарий 2 — Установка нового пароля

1. На странице `/reset-password?token=...` ввести новый валидный пароль (например, `NewPass123`) и его подтверждение.
2. Нажать **"Сохранить"**.
3. Увидеть сообщение об успехе и кнопку/редирект на `/login`.
4. Войти со старым паролем — должно отклониться.
5. Войти с новым — успех.
6. Открыть БД (`npx prisma studio`): запись в `password_reset_tokens` имеет `usedAt = <timestamp>`.

### Сценарий 3 — Защита от энумерации

1. На `/forgot-password` ввести email, которого нет в системе.
2. Нажать **"Отправить"**.
3. Должен показаться **тот же** нейтральный ответ. Письмо не приходит. Время ответа — сравнимое с реальным запросом.

### Сценарий 4 — Просроченный токен

1. Запросить восстановление.
2. Подождать 16+ минут (или вручную в БД установить `expiresAt < NOW()`).
3. Перейти по ссылке.
4. Должна показаться ошибка о просроченности и предложение запросить новую ссылку.

### Сценарий 5 — Уже использованный токен

1. Успешно сбросить пароль по ссылке (Сценарий 2).
2. Перейти по той же ссылке снова.
3. Должна показаться ошибка о том, что ссылка уже использована.

### Сценарий 6 — Несколько подряд запросов (cooldown)

1. На `/forgot-password` ввести email и отправить.
2. Сразу попробовать снова отправить.
3. Запрос должен либо мгновенно вернуть тот же нейтральный ответ (cooldown по userId — без отправки нового письма), либо отлететь на 429 (если лимит per-IP исчерпан).

### Сценарий 7 — Несколько подряд токенов: только последний валиден

1. Запросить восстановление 2 раза подряд (выждав ≥60 сек между ними, иначе сработает cooldown — см. Сценарий 6).
2. Получить 2 письма.
3. Перейти по ссылке из **первого** письма — должна показаться ошибка (уже использована/инвалидирована).
4. Перейти по ссылке из **второго** письма — успех.

### Сценарий 8 — Per-IP rate-limit

1. Несколько раз быстро отправить запросы на `/forgot-password` (как минимум 6 раз с разными email).
2. После 5 запроса с одного IP — ответ `429 Too Many Requests`.

### Сценарий 9 — Точка входа из диалога смены пароля

1. Залогиниться, открыть профиль.
2. Открыть диалог "Сменить пароль", кликнуть "Забыли пароль?".
3. Должен открыться `/forgot-password` (та же страница, что доступна с экрана логина).

## New Files Overview

### Backend

| File                                                       | Description                                          |
|------------------------------------------------------------|------------------------------------------------------|
| `prisma/schema.prisma`                                     | MODIFY: + `PasswordResetToken` + relation в `User`    |
| `prisma/migrations/<ts>_add_password_reset_tokens/...`     | NEW: миграция                                         |
| `src/controllers/passwordReset.ts`                         | NEW: 3 хендлера (`forgotPassword`, `verifyResetToken`, `resetPassword`) |
| `src/services/passwordReset.ts`                            | NEW: бизнес-логика и интеграция с email/utils         |
| `src/services/email.ts`                                    | MODIFY: + `sendPasswordResetEmail(email, resetUrl)`   |
| `src/utils/passwordResetToken.ts`                          | NEW: `createResetToken`, `hashResetToken`, expiry-helpers |
| `src/middleware/rateLimit.ts`                              | MODIFY: + `passwordResetRateLimiter`                  |
| `src/routes/auth.ts`                                       | MODIFY: + 3 routes                                    |
| `src/types/index.ts`                                       | MODIFY: + `ForgotPasswordDto`, `VerifyResetTokenDto`, `ResetPasswordDto` |
| `src/__tests__/services/passwordReset.test.ts`             | NEW: unit-тесты сервиса                               |
| `src/controllers/__tests__/passwordReset.test.ts`          | NEW: integration-тесты контроллеров                   |

### Frontend

| File                                                                  | Description                                  |
|-----------------------------------------------------------------------|----------------------------------------------|
| `src/features/forgotPassword/`                                        | NEW feature: модель + UI запроса             |
| `src/features/resetPassword/`                                         | NEW feature: модель + UI установки пароля    |
| `src/pages/forgotPassword/ForgotPasswordPage.tsx`                     | MODIFY: rewrite заглушки                     |
| `src/pages/resetPassword/`                                            | NEW page: контейнер для resetPassword feature |
| `src/pages/index.ts`                                                  | MODIFY: + export `ResetPasswordPage`         |
| `src/app/components/AppRoutes/AppRoutes.tsx`                          | MODIFY: + Route `/reset-password`            |
| `src/features/auth/ui/LoginForm/LoginForm.tsx`                        | MODIFY: + ссылка "Забыли пароль?"            |
| `src/shared/api/auth.ts`                                              | MODIFY: + 3 API-метода                       |

### Database

| File                                                          | Description                                  |
|---------------------------------------------------------------|----------------------------------------------|
| `prisma/schema.prisma`                                        | + `PasswordResetToken`, relation в `User`    |
| `prisma/migrations/<ts>_add_password_reset_tokens/migration.sql` | + CREATE TABLE + indexes + FK              |

## Required Environment Variables

| Variable          | Where                              | Example                          |
|-------------------|------------------------------------|----------------------------------|
| `RESEND_API_KEY`  | backend `.env`, prod env           | `re_...` (уже есть)              |
| `EMAIL_FROM`      | backend `.env`, prod env           | `noreply@tutor.kaluger.ru` (уже есть) |
| `FRONTEND_URL`    | backend `.env`, prod env           | `http://localhost:3000` или `https://tutor.kaluger.ru` (новая ИЛИ уже есть — проверить) |

## Common Issues

**"FRONTEND_URL не задан"** при отправке письма
→ Добавить `FRONTEND_URL` в `backend/.env` и в prod-окружение.

**Письмо не приходит в dev**
→ Проверить `RESEND_API_KEY`. Resend в free-tier разрешает отправку только на верифицированные адреса.

**Тест rate-limit падает**
→ Rate-limiter автоматически отключён при `NODE_ENV=test`. Если нужно протестировать поведение лимита — переопределить `process.env.NODE_ENV` в конкретном test-suite.

**Предыдущая ссылка из старого письма не работает**
→ По дизайну (FR-011): при новом запросе старые токены инвалидируются. Использовать ссылку из последнего письма.
