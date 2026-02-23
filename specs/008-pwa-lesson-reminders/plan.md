# Implementation Plan: PWA и напоминания об уроках

**Branch**: `008-pwa-lesson-reminders` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-pwa-lesson-reminders/spec.md`

## Summary

PWA с push-напоминаниями перед уроками. Приложение устанавливается на домашний экран (iOS/Android), отправляет push-уведомления за настраиваемое количество минут до начала урока. Уведомления только для уроков со статусом SCHEDULED/RESCHEDULED. Настройки в профиле: вкл/выкл, интервалы (5–60 мин), режим «не беспокоить во время урока». Backend: `web-push` + cron (ежеминутная проверка). Frontend: Service Worker + Effector entity + секция в профиле.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend + backend)
**Primary Dependencies**: React, Effector, MUI (frontend); Express, Prisma, web-push (backend)
**Storage**: PostgreSQL через Prisma ORM — три новые таблицы: `push_subscriptions`, `reminder_settings`, `scheduled_reminders`
**Testing**: Vitest + RTL + MSW (frontend); Jest + Supertest (backend)
**Target Platform**: Web-приложение (SPA + REST API) + PWA (iOS Safari 16.4+, Android Chrome)
**Project Type**: Web (monorepo: frontend + backend)
**Performance Goals**: Напоминания отправляются в пределах 1 минуты от запланированного времени
**Constraints**: Одна новая runtime-зависимость (`web-push`). Нет Firebase/FCM. Service Worker только для push (не полный offline-first)
**Scale/Scope**: Десятки пользователей, сотни уроков в месяц, единицы устройств на пользователя

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Sliced Design | PASS | Entity `notifications`, Feature `notificationSettings`, секция в Profile page. Strict FSD imports |
| II. Layered MVC | PASS | Routes → Controllers → Services → Prisma. Отдельные сервисы: pushNotification, reminderProcessor |
| III. Effector State | PASS | Gates, events, effects, stores, sample. Модель как namespace. useUnit для React |
| IV. Type Safety | PASS | Типы в `types/index.ts` (backend) и `*.types.ts` (frontend). Prisma-generated типы для новых моделей |
| V. Code Consistency | PASS | Named exports, function expressions, index.ts реэкспорты, русские сообщения |
| VI. Testing Discipline | PASS | Backend: Jest + Supertest + real DB. Frontend: Vitest + RTL + MSW. Effector fork тесты |
| VII. Simplicity | PASS | Минимальная реализация: cron-опрос, web-push, нет Firebase/очередей. Одна новая зависимость |

**Post-Phase 1 Re-check**: Все принципы соблюдены. Одна новая зависимость (`web-push`) обоснована — нет альтернативы для Web Push Protocol. Структура следует существующим паттернам (news feature как референс).

## Project Structure

### Documentation (this feature)

```text
specs/008-pwa-lesson-reminders/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output — resolved decisions
├── data-model.md        # Phase 1 output — entity design
├── quickstart.md        # Phase 1 output — implementation guide
├── contracts/
│   └── push-api.md      # Phase 1 output — API contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   └── schema.prisma                    # +3 models, +1 enum, +relations
├── src/
│   ├── controllers/
│   │   ├── push/                        # NEW: subscribe, unsubscribe, vapidKey, subscriptions
│   │   └── reminderSettings/            # NEW: get, update
│   ├── routes/
│   │   ├── push.ts                      # NEW
│   │   └── reminderSettings.ts          # NEW
│   ├── services/
│   │   ├── pushNotification.ts          # NEW: send push via web-push
│   │   └── reminderProcessor.ts         # NEW: cron logic
│   ├── types/
│   │   └── index.ts                     # +DTOs for push & settings
│   └── index.ts                         # +cron job, +routes registration
└── .env.example                         # +VAPID variables

frontend/
├── public/
│   ├── manifest.json                    # UPDATED: name, icons, theme
│   ├── index.html                       # UPDATED: iOS meta-tags
│   └── push-sw.js                       # NEW: service worker for push
├── src/
│   ├── app/
│   │   └── model/
│   │       └── app-init.model.ts        # UPDATED: +notification init
│   ├── entities/
│   │   └── notifications/               # NEW: core state
│   │       ├── notifications.model.ts
│   │       ├── notifications.types.ts
│   │       └── index.ts
│   ├── features/
│   │   └── notificationSettings/        # NEW: settings UI
│   │       └── ui/
│   │           └── ReminderSettings/
│   ├── pages/
│   │   └── profile/
│   │       └── ProfilePage.tsx          # UPDATED: +notifications section
│   ├── shared/
│   │   └── api/
│   │       └── notifications.ts         # NEW: API calls
│   └── widgets/
│       └── sidebar/
│           └── Sidebar.tsx              # No changes needed (badge not required for reminders)
```

**Structure Decision**: Web application (Option 2). Monorepo с frontend/ и backend/ — соответствует существующей структуре проекта. Новый код следует тем же паттернам: controllers в отдельных файлах, services для бизнес-логики, entities по FSD.

## Complexity Tracking

Нет нарушений Constitution — таблица не требуется.
