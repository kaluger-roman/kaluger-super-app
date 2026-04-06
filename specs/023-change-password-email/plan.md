# Implementation Plan: Смена пароля и email

**Branch**: `023-change-password-email` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-change-password-email/spec.md`

## Summary

Добавление функций смены пароля и смены email для авторизованных пользователей. Смена пароля — простой CRUD (проверка текущего + обновление хэша). Смена email — двухэтапный процесс с верификацией через 6-значный код на новый адрес. Обе функции интегрируются в существующую страницу профиля. Требуется одна миграция (поле `pendingEmail`) и 4 новых API-эндпоинта.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20
**Primary Dependencies**: React, Effector, MUI (frontend); Express, Prisma, bcryptjs (backend)
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Vitest + RTL + MSW (frontend), Jest + Supertest (backend)
**Target Platform**: Web (SPA + REST API)
**Project Type**: Web application (monorepo: frontend + backend)
**Performance Goals**: Standard web app (<1s response for all auth operations)
**Constraints**: JWT Bearer auth, FSD architecture, Effector state management
**Scale/Scope**: Single-user app (private tutor), ~4 new backend files, ~2 new frontend features

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Design | PASS | Новые features `changePassword` и `changeEmail` в `features/`, импортируются из `pages/profile` |
| II. Layered MVC | PASS | Routes → Controllers → Services → Prisma. Контроллеры для валидации, сервисы для бизнес-логики |
| III. Effector State | PASS | Модели с `$store`, `eventName`, `effectNameFx`, `sample`, `useUnit` |
| IV. Type Safety | PASS | Новые DTO-типы в `types/index.ts`, `type` keyword, `import type` |
| V. Code Consistency | PASS | Named exports, function expressions, `index.ts` barrel files, Russian error messages |
| VI. Testing Discipline | PASS | Backend: Jest + Supertest, Frontend: Vitest + RTL. Тесты для всех сценариев |
| VII. Simplicity | PASS | Минимальные изменения: 1 новое поле в БД, переиспользование существующих утилит |

**Pre-design gate**: PASSED
**Post-design gate**: PASSED — дизайн соответствует всем 7 принципам конституции

## Project Structure

### Documentation (this feature)

```text
specs/023-change-password-email/
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
│   └── schema.prisma              # Add pendingEmail field to User
├── src/
│   ├── controllers/
│   │   ├── changePassword.ts      # NEW: change password controller
│   │   └── changeEmail.ts         # NEW: change email controller
│   ├── services/
│   │   ├── changePassword.ts      # NEW: change password service
│   │   └── changeEmail.ts         # NEW: change email service
│   ├── routes/
│   │   └── auth.ts                # MODIFY: add 4 new routes
│   └── types/
│       └── index.ts               # MODIFY: add new DTOs

frontend/
├── src/
│   ├── features/
│   │   ├── changePassword/
│   │   │   ├── index.ts                          # Barrel export
│   │   │   ├── models/
│   │   │   │   └── changePassword.model.ts       # Effector model
│   │   │   └── ui/
│   │   │       ├── ChangePasswordForm.tsx         # Form component
│   │   │       └── ChangePasswordForm.styles.ts   # Styled components
│   │   └── changeEmail/
│   │       ├── index.ts                          # Barrel export
│   │       ├── models/
│   │       │   └── changeEmail.model.ts          # Effector model
│   │       └── ui/
│   │           ├── ChangeEmailForm.tsx            # Form + code input
│   │           └── ChangeEmailForm.styles.ts      # Styled components
│   ├── shared/
│   │   └── api/
│   │       └── auth.ts                           # MODIFY: add 4 API methods
│   └── pages/
│       └── profile/
│           └── ProfilePage.tsx                   # MODIFY: integrate features
```

**Structure Decision**: Монорепо с раздельными frontend/backend. Новые features следуют FSD (features-level). Бэкенд следует layered MVC с отдельными controller/service файлами для каждой функции.

## Complexity Tracking

Нет нарушений конституции — таблица пуста.
