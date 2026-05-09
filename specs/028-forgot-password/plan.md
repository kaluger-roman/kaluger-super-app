# Implementation Plan: Восстановление пароля ("Забыли пароль")

**Branch**: `028-forgot-password` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/028-forgot-password/spec.md`

## Summary

Реализация link-based password reset: пользователь запрашивает восстановление по email → получает письмо с одноразовой ссылкой → переходит по ней на страницу установки нового пароля → пароль обновляется. Используется новая таблица `PasswordResetToken` (хеш токена + срок действия + признак использования), переиспользуется существующая инфраструктура отправки писем (Resend) и валидации пароля. Защита: per-email cooldown 60 сек (FR-022), per-IP rate-limit (FR-023), защита от энумерации аккаунтов (FR-004), хеширование токена в БД (FR-012). На экране логина добавляется ссылка-точка входа "Забыли пароль?". Страница-заглушка `/forgot-password` заменяется реальной формой; добавляется новый роут `/reset-password`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20
**Primary Dependencies**: React, Effector, MUI, Material UI styled-components (frontend); Express, Prisma, bcryptjs, express-rate-limit, Resend (backend) — все уже в проекте
**Storage**: PostgreSQL via Prisma ORM (новая таблица `password_reset_tokens`)
**Testing**: Vitest + RTL + MSW (frontend), Jest + Supertest (backend) — без моков Prisma на бекенде
**Target Platform**: Web (SPA + REST API)
**Project Type**: Web application (monorepo: frontend + backend)
**Performance Goals**: <500ms p95 для всех auth-эндпоинтов; защита от энумерации требует одинакового времени ответа для существующих и несуществующих email
**Constraints**: JWT Bearer auth (без server-side blacklist); FSD на фронте; Layered MVC на бэке; Effector для state; русский язык всех UI- и error-сообщений
**Scale/Scope**: Однопользовательское приложение для частного репетитора → low traffic; новых файлов: ~6 на бэкенде, ~10 на фронте; 1 миграция БД

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Design | PASS | Новые `features/forgotPassword` и `features/resetPassword`; страницы `pages/forgotPassword` (rewrite) и `pages/resetPassword` (new) композируют эти features. Импорты строго `pages → features → entities → shared` |
| II. Layered MVC | PASS | Новые `controllers/passwordReset.ts` (HTTP + валидация) и `services/passwordReset.ts` (бизнес-логика). Роуты регистрируются в существующем `routes/auth.ts`. Утилита для генерации/хеша токена — в `utils/` |
| III. Effector State | PASS | Модели соответствуют конвенциям: `$store`, `eventName`, `effectNameFx`, `sample`, `useUnit`. Без `.on()`, `.watch()`, `useStore`, `getState()` |
| IV. Type Safety | PASS | Новые DTO в `backend/src/types/index.ts`; на фронте — `*.types.ts` файлы рядом с моделями. `type` keyword, `import type`, отсутствие `any` |
| V. Code Consistency | PASS | Named exports, function expressions, `index.ts` barrel-файлы в каждой новой папке, русские сообщения об ошибках, ограничения по размеру файлов соблюдены |
| VI. Testing Discipline | PASS | Backend: unit-тесты сервиса + integration-тесты контроллеров (Jest + Supertest, реальная БД); Frontend: тесты Effector-моделей (`fork`), тесты компонентов (RTL + MSW). Регрессионные сценарии: невалидный/использованный/истёкший токен, защита от энумерации, rate-limit |
| VII. Simplicity | PASS | Новая таблица `PasswordResetToken` оправдана (одноразовые токены + история не пересекается с email-верификацией). Переиспользована существующая инфраструктура email и валидации. Без feature-flags и backwards-compat. Без абстракций "на будущее" |

**Pre-design gate**: PASSED
**Post-design gate**: PASSED — финальный дизайн (см. data-model.md, contracts/) сохраняет соответствие всем 7 принципам

## Project Structure

### Documentation (this feature)

```text
specs/028-forgot-password/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity model changes
├── quickstart.md        # Phase 1: setup guide
├── contracts/
│   └── api.md           # Phase 1: API contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                                # MODIFY: + PasswordResetToken model + relation в User
│   └── migrations/<timestamp>_add_password_reset_tokens/  # NEW: Prisma migration
├── src/
│   ├── controllers/
│   │   └── passwordReset.ts                          # NEW: 3 хендлера (forgot, verifyToken, reset)
│   ├── services/
│   │   ├── passwordReset.ts                          # NEW: бизнес-логика (generate/store/hash, lookup, consume)
│   │   └── email.ts                                  # MODIFY: + sendPasswordResetEmail
│   ├── utils/
│   │   └── passwordResetToken.ts                     # NEW: createResetToken, hashResetToken, expiry helpers
│   ├── middleware/
│   │   └── rateLimit.ts                              # MODIFY: + passwordResetRateLimiter (per-IP)
│   ├── routes/
│   │   └── auth.ts                                   # MODIFY: + 3 routes (без authenticateToken)
│   ├── types/
│   │   └── index.ts                                  # MODIFY: + ForgotPasswordDto, VerifyResetTokenDto, ResetPasswordDto
│   └── __tests__/
│       ├── controllers/passwordReset.test.ts         # NEW: integration tests
│       └── services/passwordReset.test.ts            # NEW: unit tests

frontend/
├── src/
│   ├── features/
│   │   ├── forgotPassword/
│   │   │   ├── index.ts                              # Barrel
│   │   │   ├── models/
│   │   │   │   ├── index.ts
│   │   │   │   ├── forgotPassword.model.ts            # Effector model
│   │   │   │   ├── forgotPassword.helpers.ts          # extractAxiosError, etc.
│   │   │   │   ├── forgotPassword.types.ts            # local types
│   │   │   │   └── __tests__/forgotPassword.model.test.ts
│   │   │   └── ui/
│   │   │       └── ForgotPasswordForm/
│   │   │           ├── ForgotPasswordForm.tsx
│   │   │           ├── ForgotPasswordForm.styled.ts
│   │   │           ├── index.ts
│   │   │           └── __tests__/ForgotPasswordForm.test.tsx
│   │   └── resetPassword/
│   │       ├── index.ts
│   │       ├── models/
│   │       │   ├── index.ts
│   │       │   ├── resetPassword.model.ts
│   │       │   ├── resetPassword.helpers.ts
│   │       │   ├── resetPassword.types.ts
│   │       │   └── __tests__/resetPassword.model.test.ts
│   │       └── ui/
│   │           └── ResetPasswordForm/
│   │               ├── ResetPasswordForm.tsx
│   │               ├── ResetPasswordForm.styled.ts
│   │               ├── index.ts
│   │               └── __tests__/ResetPasswordForm.test.tsx
│   ├── pages/
│   │   ├── forgotPassword/                           # MODIFY: rewrite stub → render <ForgotPasswordForm/>
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── ForgotPasswordPage.styled.ts
│   │   │   ├── index.ts
│   │   │   └── __tests__/ForgotPasswordPage.test.tsx
│   │   ├── resetPassword/                            # NEW
│   │   │   ├── ResetPasswordPage.tsx                 # читает ?token из URL, передаёт в feature
│   │   │   ├── ResetPasswordPage.styled.ts
│   │   │   ├── index.ts
│   │   │   └── __tests__/ResetPasswordPage.test.tsx
│   │   └── index.ts                                  # MODIFY: + export ResetPasswordPage
│   ├── shared/
│   │   ├── api/
│   │   │   └── auth.ts                               # MODIFY: + forgotPassword, verifyResetToken, resetPassword
│   │   └── types/                                    # MODIFY: + типы запросов/ответов (или в auth.ts)
│   ├── features/auth/ui/LoginForm/LoginForm.tsx      # MODIFY: + ссылка "Забыли пароль?"
│   └── app/components/AppRoutes/AppRoutes.tsx        # MODIFY: + Route /reset-password
```

**Structure Decision**: Существующий монорепо `frontend/` + `backend/`. Новые features (`forgotPassword`, `resetPassword`) — два отдельных юзкейса c одной целью, но с разным state и UI: разделение даёт более простые модели и меньше связности. Страницы — два отдельных роута (`/forgot-password` и `/reset-password`); композиция feature → page стандартная для FSD проекта. Бэкенд: один контроллер `passwordReset.ts` с тремя хендлерами и один сервис `passwordReset.ts` (механика общая, разделять смысла нет). Утилита генерации токена — в `utils/passwordResetToken.ts`, отдельно от существующего `utils/verification.ts` чтобы не смешивать понятия (6-значный код регистрации vs длинный URL-токен сброса).

## Complexity Tracking

> Нет нарушений конституции — таблица пуста.
