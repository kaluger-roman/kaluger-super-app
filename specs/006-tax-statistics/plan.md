# Implementation Plan: Налоговая информация на дашборде статистики

**Branch**: `006-tax-statistics` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-tax-statistics/spec.md`

## Summary

Добавить поле `taxRate` в модель User (по умолчанию 6%), расширить эндпоинт
статистики для серверного расчёта суммы налога (`taxAmount = round(earnings × taxRate / 100)`),
добавить редактирование ставки на странице профиля и карточку налога на дашборде
финансовой статистики.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend + backend)
**Primary Dependencies**: React, Effector, MUI (frontend); Express, Prisma (backend)
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Vitest + RTL + MSW (frontend), Jest + Supertest (backend)
**Target Platform**: Web (SPA + REST API)
**Project Type**: Monorepo (frontend + backend)
**Performance Goals**: Стандартное время отклика, без дополнительных запросов к БД
**Constraints**: Расчёт налога на сервере; один дополнительный запрос к User в контроллере статистики
**Scale/Scope**: 2 страницы (профиль + статистика), 1 миграция, ~12 файлов

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Design | PASS | Изменения в `pages/profile`, `pages/ReportsPage`, `entities/user`, `shared/types` — строго по слоям |
| II. Layered MVC | PASS | Route → Controller → Prisma; расчёт налога в контроллере (простая формула, service не нужен) |
| III. Effector State Management | PASS | Новые stores/events в profile.model, стандартный `sample` + `useUnit` |
| IV. Type Safety | PASS | Расширение существующих типов `User` и `Statistics`, `import type` |
| V. Code Consistency | PASS | Named exports, function expressions, index.ts re-exports |
| VI. Testing Discipline | PASS | Unit-тесты для расчёта на бэкенде, тесты profile model и FinancialStatistics |
| VII. Simplicity | PASS | Минимальные изменения: 1 поле в БД, формула в 1 строку, 1 карточка в UI |

**Gate result**: PASS — нет нарушений, можно двигаться дальше.

## Project Structure

### Documentation (this feature)

```text
specs/006-tax-statistics/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── statistics.md    # Updated statistics endpoint contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   └── schema.prisma                          # + taxRate field on User
├── src/
│   ├── types/index.ts                         # + taxRate in User type, taxAmount in Statistics
│   ├── controllers/
│   │   ├── auth.ts                            # updateProfile: + taxRate param
│   │   └── statistics/getStatistics.ts        # + tax calculation logic
│   └── routes/                                # No changes needed
└── tests/                                     # + tax-related test cases

frontend/src/
├── shared/
│   ├── types/index.ts                         # + taxRate on User, taxAmount on Statistics
│   └── api/auth.ts                            # updateProfile: + taxRate param
├── entities/user/                             # No changes (generic store)
├── pages/
│   ├── profile/
│   │   ├── ProfilePage.tsx                    # + tax rate input field
│   │   └── models/profile.model.ts            # + $taxRate, taxRateChanged
│   └── ReportsPage/
│       └── components/FinancialStatistics/    # + tax card
└── tests/                                     # + tax-related test cases
```

**Structure Decision**: Используется существующая структура монорепо. Новых директорий
и модулей не создаётся — все изменения в существующих файлах.
