# Implementation Plan: Фильтрация уроков по дате оплаты

**Branch**: `024-lesson-payment-filter` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-lesson-payment-filter/spec.md`

## Summary

Добавление фильтрации уроков по дате оплаты (`paymentDate`) на странице уроков. Поле уже существует в БД — требуются только изменения на бэкенде (новые query-параметры) и фронтенде (UI фильтра, Effector-модель, API-клиент). Включает предустановленные периоды (текущий/прошлый месяц, текущая неделя) и взаимоисключение с фильтром «Только неоплаченные».

## Technical Context

**Language/Version**: TypeScript 5.x (фронтенд и бэкенд)
**Primary Dependencies**: React, Effector, MUI + @mui/x-date-pickers (фронтенд); Express, Prisma (бэкенд)
**Storage**: PostgreSQL (поле `paymentDate DateTime?` в модели Lesson уже существует)
**Testing**: Vitest + RTL + MSW (фронтенд), Jest + Supertest (бэкенд)
**Target Platform**: Web (SPA + REST API)
**Project Type**: web (монорепо: frontend/ + backend/)
**Performance Goals**: Фильтрация < 2 сек при стандартных объёмах данных
**Constraints**: Без миграции БД, без новых зависимостей
**Scale/Scope**: ~10 файлов затронуто (5 модификация + 3-4 новых тестов)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Статус | Комментарий |
|---------|--------|-------------|
| I. Feature-Sliced Design | PASS | Новый UI в `pages/lessons/components`, модель в `features/lessons/models`, API в `shared/api` — направление импортов соблюдено |
| II. Layered MVC | PASS | Изменения только в controller (добавление query-params в getLessons). Бизнес-логика простая — Prisma where clause |
| III. Effector State Management | PASS | Новые сторы/события в существующем файле. Только `sample`, `createStore`, `createEvent`. `useUnit` для связи с React |
| IV. Type Safety | PASS | Новые типы через `type`, `import type`. Без `any` |
| V. Code Consistency | PASS | Named exports, function expressions, index.ts re-exports. Styled-components для стилей |
| VI. Testing Discipline | PASS | Бэкенд-тест с реальной БД (Jest + Supertest). Фронтенд: Effector fork-тесты + RTL |
| VII. Simplicity | PASS | Минимальные изменения в существующих файлах. Нет новых абстракций — расширение текущих паттернов |

**Gate result**: PASS — все принципы соблюдены.

## Project Structure

### Documentation (this feature)

```text
specs/024-lesson-payment-filter/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: data model
├── quickstart.md        # Phase 1: implementation guide
├── contracts/
│   └── get-lessons.md   # Phase 1: API contract extension
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── controllers/lessons/
│       └── getLessons.ts              # MODIFY: add paymentDateFrom/To params
└── tests/                             # NEW: payment date filter test

frontend/
├── src/
│   ├── features/lessons/
│   │   └── models/
│   │       ├── lessons-filters.model.ts          # MODIFY: add payment date stores/events
│   │       ├── lessons-page-loader.helpers.ts     # MODIFY: add payment date to LoadParams
│   │       ├── lessons-page-loader.model.ts       # MODIFY: add new stores to clock/source
│   │       └── lessons-reload.model.ts            # MODIFY: add new stores to source
│   ├── pages/lessons/
│   │   └── components/LessonsFilters/
│   │       └── LessonsFilters.tsx                 # MODIFY: add DatePicker + Chip UI
│   └── shared/
│       └── api/lessons.ts                         # MODIFY: add paymentDateFrom/To to types
└── tests/                                          # NEW: filter model + UI tests
```

**Structure Decision**: Монорепо (frontend/ + backend/) — изменения распределены по обоим пакетам. Новых файлов минимум — преимущественно расширение существующих.

## Complexity Tracking

Нарушений конституции нет — таблица не требуется.
