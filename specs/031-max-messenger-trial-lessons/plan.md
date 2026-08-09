# Implementation Plan: Мессенджер MAX и пробные уроки без ученика

**Branch**: `031-max-messenger-trial-lessons` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-max-messenger-trial-lessons/spec.md`

## Summary

Две независимые доработки:

1. **MAX в списке мессенджеров** — расширение Prisma enum `ContactMethod`
   (WHATSAPP, TELEGRAM → + MAX) и всех мест выбора/отображения способа связи.
   Захардкоженные тернарники `"WHATSAPP" ? "WhatsApp" : "Telegram"` заменяются
   на общий маппер лейблов.
2. **Пробные уроки без ученика** — `Lesson.studentId` становится nullable,
   добавляются поля потенциального ученика (`prospectName`, `prospectPhone`,
   `prospectContactMethod`). Форма урока получает режим «пробный урок без
   ученика». Инвариант «либо studentId, либо prospectName» контролируется
   валидацией на бекенде. Привязка к ученику — через обычное редактирование
   урока (установка `studentId` очищает prospect-поля).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20
**Primary Dependencies**: React, Effector, MUI, styled-components (frontend);
Express, Prisma (backend) — всё уже в проекте, новых зависимостей нет
**Storage**: PostgreSQL via Prisma ORM — расширение enum `ContactMethod`,
`lessons.studentId` → nullable, +3 колонки (`prospectName`, `prospectPhone`,
`prospectContactMethod`)
**Testing**: Vitest + RTL + MSW (frontend), Jest + Supertest + реальная
тест-БД (backend), Playwright (e2e)
**Target Platform**: Web (SPA + REST API), деплой на VPS
**Project Type**: web (frontend + backend monorepo)
**Performance Goals**: без изменений — обычные CRUD-запросы
**Constraints**: обратная совместимость данных (существующие ученики и уроки
не меняются); prospect-поля не должны утекать в кабинет ученика
**Scale/Scope**: ~15 файлов бекенда, ~12 файлов фронтенда, 1 миграция БД

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Статус | Комментарий |
|---------|--------|-------------|
| I. FSD (frontend) | ✅ PASS | Изменения в `features/lessons`, `features/students`, `entities`, `shared/types`, `shared/constants` — импорты строго вниз |
| II. Layered MVC (backend) | ✅ PASS | Валидация в controllers/validators, логика в controllers/services, без утечек слоёв |
| III. Effector | ✅ PASS | Расширение существующей модели LessonForm: `$store`/`sample`/`useUnit`, форма в Effector-сторах |
| IV. Type Safety | ✅ PASS | `type` only, без `any`; типы расширяются в `backend/src/types` и `frontend/src/shared/types` |
| V. Code Consistency | ✅ PASS | Named exports, лимиты размеров файлов соблюдаются (маппер лейблов выносится в shared) |
| VI. Testing Discipline | ✅ PASS | Unit + integration тесты для всех новых веток логики, регрессионные на crash-points |
| VII. Simplicity | ✅ PASS | Prospect — поля урока, а не новая сущность; без feature-флагов и DB-констрейнтов «на будущее» |

**Post-design re-check (after Phase 1)**: ✅ PASS — дизайн не добавил новых
сущностей, зависимостей или отклонений от принципов.

## Project Structure

### Documentation (this feature)

```text
specs/031-max-messenger-trial-lessons/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output — изменения REST API
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                          # enum ContactMethod + MAX; Lesson: studentId?, prospect-поля
│   └── migrations/<ts>_max_and_prospect_lessons/
├── src/
│   ├── types/
│   │   ├── student.ts                         # ContactMethod + "MAX"
│   │   └── lesson.ts                          # CreateLessonDto/UpdateLessonDto + prospect-поля, studentId?
│   ├── controllers/
│   │   ├── students/validators.ts             # тексты ошибок с учётом MAX
│   │   └── lessons/
│   │       ├── validators.ts                  # инвариант studentId XOR prospectName; запрет isRecurring без ученика
│   │       ├── createLesson.ts                # ветка создания без ученика (price ?? 0)
│   │       ├── updateLesson.ts                # привязка к ученику (очистка prospect-полей); пропуск переноса оплаты
│   │       ├── deleteLesson.ts                # guard: deleteAllFuture только при studentId
│   │       └── getCancellationInfo.ts         # findNextUnpaidLesson только при studentId
│   └── services/
│       ├── reminderProcessor.ts               # student?.name ?? prospectName (crash-point)
│       └── studentLessonBroadcast/            # пропуск broadcast при studentId = null
└── src/**/__tests__/                          # unit + integration тесты

frontend/
├── src/
│   ├── shared/
│   │   ├── types/
│   │   │   ├── student.ts                     # ContactMethod + "MAX"
│   │   │   └── lesson.ts                      # prospect-поля, studentId: string | null
│   │   └── constants/                         # CONTACT_METHOD_LABELS (маппер лейблов)
│   ├── features/
│   │   ├── students/ui/
│   │   │   ├── StudentForm/StudentFormFields/ # MenuItem MAX (ученик + родитель)
│   │   │   └── StudentViewDialog/StudentContacts.tsx  # лейблы через маппер
│   │   └── lessons/
│   │       ├── models/                        # lesson-form model/helpers: prospect-режим, валидация
│   │       └── ui/LessonForm/                 # toggle «без ученика», поля prospect, скрытие isRecurring
│   ├── pages/students/components/StudentCard/ # лейбл мессенджера через маппер
│   └── **/__tests__/                          # unit тесты
└── e2e/
    ├── students/create-student.spec.ts        # сценарий с MAX
    └── lessons/                               # сценарий пробного урока без ученика
```

**Structure Decision**: существующая монорепо-структура (frontend FSD +
backend MVC); новых пакетов/слоёв не появляется. Prospect-данные — поля
модели `Lesson`, отдельной сущности и отдельного раздела UI нет.

## Complexity Tracking

Нарушений Constitution нет — таблица не требуется.
