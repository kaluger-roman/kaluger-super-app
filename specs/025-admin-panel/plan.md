# Implementation Plan: Admin Panel

**Branch**: `025-admin-panel` | **Date**: 2026-03-30 | **Spec**: `specs/025-admin-panel/spec.md`

## Summary

Админ-панель для системного администрирования приложения. Аутентификация через ENV-переменные (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Первая фича — управление бэкапами БД (бэкенд уже реализован). Также: обзор системы (статистика). Фронтенд — отдельная страница `/admin` с изолированным auth-потоком.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend + backend)
**Primary Dependencies**: Express, Prisma, React, Effector, MUI
**Storage**: PostgreSQL via Prisma (BackupSettings уже существует)
**Testing**: Jest + Supertest (backend), Vitest + RTL (frontend)
**Target Platform**: Web (SPA + Express API)
**Project Type**: Web (monorepo: frontend + backend)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Design | PASS | Admin — отдельная feature в `features/admin` |
| II. Layered MVC | PASS | Routes → Controllers → Services |
| III. Effector State | PASS | `$adminToken`, `adminLoginFx` — стандартный Effector |
| IV. Type Safety | PASS | Все типы в `types/index.ts` (backend), `*.types.ts` (frontend) |
| V. Code Consistency | PASS | Named exports, function expressions, index.ts |
| VI. Testing Discipline | PASS | Backend: integration tests, Frontend: RTL |
| VII. Simplicity | PASS | Минимальный набор: auth + backup + overview |

## Project Structure

### Documentation

```text
specs/025-admin-panel/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── admin-api.md
```

### Source Code

```text
backend/src/
├── middleware/
│   └── adminAuth.ts            # NEW: authenticateAdmin middleware
├── controllers/
│   ├── admin/
│   │   ├── index.ts            # NEW: re-exports
│   │   ├── login.ts            # NEW: admin login
│   │   └── overview.ts         # NEW: system overview
│   └── backup/                 # EXISTING: перенос под admin routes
│       ├── index.ts
│       ├── getSettings.ts      # MODIFY: use adminAuth
│       ├── updateSettings.ts   # MODIFY: use adminAuth
│       └── createBackup.ts     # MODIFY: use adminAuth
├── routes/
│   ├── admin.ts                # NEW: /api/admin/* routes
│   └── backup.ts               # DELETE: merged into admin.ts
├── services/
│   └── backup.ts               # EXISTING: no changes
└── types/
    └── index.ts                # MODIFY: add admin types

frontend/src/
├── features/
│   └── admin/
│       ├── index.ts            # NEW
│       ├── models/
│       │   └── admin.model.ts  # NEW: $adminToken, loginFx, etc.
│       ├── ui/
│       │   ├── AdminLogin.tsx  # NEW: login form
│       │   └── index.ts       # NEW
│       └── api/
│           ├── admin.ts        # NEW: admin API calls
│           └── index.ts       # NEW
├── pages/
│   └── AdminPage/
│       ├── index.ts            # NEW
│       ├── AdminPage.tsx       # NEW: main admin page
│       ├── components/
│       │   ├── BackupSection.tsx   # NEW
│       │   ├── OverviewSection.tsx # NEW
│       │   └── index.ts           # NEW
│       └── styled.ts           # NEW: styled components
├── shared/
│   └── api/
│       └── adminBase.ts        # NEW: admin axios instance
└── app/
    └── components/
        └── AppRoutes/
            └── AppRoutes.tsx   # MODIFY: add /admin route
```

## Implementation Phases

### Phase 1: Backend — Admin Auth + Routes (существующий бэкап + новое)

1. Добавить `ADMIN_EMAIL`, `ADMIN_PASSWORD` в `.env.example`
2. Создать `middleware/adminAuth.ts` — middleware с проверкой admin JWT
3. Создать `controllers/admin/login.ts` — логин через bcrypt.compare с ENV
4. Создать `controllers/admin/overview.ts` — count queries + uptime
5. Создать `routes/admin.ts` — объединить admin login, overview, backup routes
6. Перенести backup routes под `/api/admin/backup/*`
7. Удалить `routes/backup.ts`, обновить `index.ts`
8. Добавить типы `AdminJwtPayload`, `AdminLoginDto`, `AdminOverviewResponse`
9. Тесты: admin login, overview endpoint, backup auth migration

### Phase 2: Frontend — Admin Feature + Pages

1. Создать `shared/api/adminBase.ts` — axios instance с adminToken
2. Создать `features/admin/` — Effector model, API, UI (login form)
3. Создать `pages/AdminPage/` — dashboard с табами: Обзор, Бэкапы
4. Добавить route `/admin` в AppRoutes
5. Тесты: admin model, login form, backup section
