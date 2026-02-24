# Tasks: PWA и напоминания об уроках

**Input**: Design documents from `/specs/008-pwa-lesson-reminders/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/push-api.md, quickstart.md

**Tests**: All new code MUST be covered by tests (Constitution Principle VI). Backend: Jest + Supertest + real DB. Frontend: Vitest + RTL + MSW, Effector stores with `fork`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, generate keys, prepare project configuration

- [ ] T001 Install `web-push` and `@types/web-push` in `backend/package.json`
- [ ] T002 [P] Generate VAPID keys and add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` to `backend/.env`, `backend/.env.test`, and `backend/.env.example`
- [ ] T003 [P] Add `ReminderStatus` enum, `PushSubscription`, `ReminderSettings`, `ScheduledReminder` models and relations to `User`/`Lesson` in `backend/prisma/schema.prisma` per data-model.md
- [ ] T004 Run Prisma migration (`npm run db:migrate` from `backend/`) to create `push_subscriptions`, `reminder_settings`, `scheduled_reminders` tables
- [ ] T005 Run `npm run db:migrate:test` in `backend/` to apply migration to test database

**Checkpoint**: Dependencies installed, VAPID keys ready, database schema updated (dev + test)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, API module, and service worker shell that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Add push notification types (`PushSubscriptionDto`, `PushUnsubscribeDto`, `ReminderSettingsDto`, `ReminderSettingsResponse`, `PushSubscriptionResponse`, `PushNotificationPayload`) to `backend/src/types/index.ts` per contracts/push-api.md
- [ ] T007 [P] Create notifications API module with `getVapidKey`, `subscribe`, `unsubscribe`, `getSubscriptions`, `getSettings`, `updateSettings` in `frontend/src/shared/api/notifications.ts` per contracts/push-api.md
- [ ] T008 [P] Create notification types (`ReminderSettings`, `PushSubscriptionInfo`, `VapidKeyResponse`) in `frontend/src/entities/notifications/notifications.types.ts`
- [ ] T009 [P] Create service worker `frontend/public/push-sw.js` with `push` event handler (show notification) and `notificationclick` event handler (navigate to `/lessons`). Minimal — no caching

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Установка приложения на устройство (Priority: P1) 🎯 MVP

**Goal**: Пользователь может установить приложение на домашний экран (Android/iOS) и запустить его в standalone режиме

**Independent Test**: Открыть приложение в мобильном браузере, установить на домашний экран, запустить — приложение открывается без адресной строки, с иконкой «Репетитор» и splash screen

### Implementation for User Story 1

- [ ] T010 [P] [US1] Update `frontend/public/manifest.json`: set `name` to «Репетитор», `short_name` to «Репетитор», `display` to `standalone`, `start_url` to `/`, `theme_color`, `background_color`, add proper icons (192x192, 512x512, maskable)
- [ ] T011 [P] [US1] Add iOS PWA meta-tags to `frontend/public/index.html`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`, apple-touch-icon links
- [ ] T012 [US1] Register service worker in `frontend/src/app/model/app-init.model.ts`: add SW registration effect, call on app init (check `'serviceWorker' in navigator`), store registration in Effector store

**Checkpoint**: App installable on Android (Chrome prompt) and iOS (Share → Add to Home Screen). Launches in standalone mode with correct name and icon

---

## Phase 4: User Story 2 — Подписка на push-уведомления (Priority: P1)

**Goal**: Пользователь подписывается на push-уведомления, подписка сохраняется на сервере и привязывается к аккаунту

**Independent Test**: Включить напоминания → система запросит разрешение → подписка сохранена на сервере. Проверить через `GET /api/push/subscriptions`

### Implementation for User Story 2

- [ ] T013 [P] [US2] Create `backend/src/controllers/push/getVapidKey.ts`: return `VAPID_PUBLIC_KEY` from env
- [ ] T014 [P] [US2] Create `backend/src/controllers/push/subscribe.ts`: validate `PushSubscriptionDto`, upsert by endpoint in `push_subscriptions` table, return `PushSubscriptionResponse`
- [ ] T015 [P] [US2] Create `backend/src/controllers/push/unsubscribe.ts`: find by endpoint + userId, delete, return 200 or 404
- [ ] T016 [P] [US2] Create `backend/src/controllers/push/getSubscriptions.ts`: return all subscriptions for authenticated user
- [ ] T017 [US2] Create `backend/src/controllers/push/index.ts`: re-export all push controllers
- [ ] T018 [US2] Create `backend/src/routes/push.ts`: register GET `/vapid-key`, POST `/subscribe`, DELETE `/unsubscribe`, GET `/subscriptions` with `authenticateToken` middleware (except vapid-key)
- [ ] T019 [US2] Register push routes in `backend/src/index.ts`: import and mount at `/api/push`
- [ ] T020 [US2] Add push subscription logic to `frontend/src/entities/notifications/notifications.model.ts`: effects (`loadVapidKeyFx`, `subscribePushFx`, `unsubscribePushFx`), stores (`$vapidKey`, `$pushSubscription`, `$pushPermission`, `$isPushSupported`), events, samples for subscription flow. Check `'PushManager' in window` for support detection
- [ ] T021 [US2] Create `frontend/src/entities/notifications/index.ts`: re-export model as namespace `notificationsModel`

### Tests for User Story 2

- [ ] T022 [P] [US2] Backend tests for push endpoints in `backend/src/__tests__/push.test.ts`: test subscribe (201 created, 200 upsert, 400 invalid), unsubscribe (200, 404), getSubscriptions (returns user's subscriptions only), getVapidKey (returns public key). Use Supertest + real DB
- [ ] T023 [P] [US2] Frontend tests for notifications model in `frontend/src/entities/notifications/__tests__/notifications.model.test.ts`: test subscription flow with Effector `fork` + `allSettled`, test `$isPushSupported` detection, test permission handling

**Checkpoint**: Push subscription flow works end-to-end. All tests pass. User can subscribe/unsubscribe, server stores subscription. Multiple devices supported

---

## Phase 5: User Story 3 — Настройка напоминаний (Priority: P1)

**Goal**: Пользователь управляет настройками напоминаний в профиле: вкл/выкл, интервалы, режим «не беспокоить»

**Independent Test**: Зайти в профиль → раздел «Напоминания об уроках» → включить, добавить интервалы 5 и 30 мин, включить «Не беспокоить» → перезагрузить → настройки сохранены

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create `backend/src/controllers/reminderSettings/getReminderSettings.ts`: find or create (lazy) `ReminderSettings` for authenticated user, return `ReminderSettingsResponse`
- [ ] T025 [P] [US3] Create `backend/src/controllers/reminderSettings/updateReminderSettings.ts`: validate `ReminderSettingsDto` (intervals in [5,10,15,30,60], no duplicates), update settings, auto-set `[30]` if enabling with empty intervals, return updated settings
- [ ] T026 [US3] Create `backend/src/controllers/reminderSettings/index.ts`: re-export controllers
- [ ] T027 [US3] Create `backend/src/routes/reminderSettings.ts`: register GET `/` and PUT `/` with `authenticateToken` middleware
- [ ] T028 [US3] Register reminder settings routes in `backend/src/index.ts`: mount at `/api/reminder-settings`
- [ ] T029 [US3] Add reminder settings logic to `frontend/src/entities/notifications/notifications.model.ts`: effects (`loadSettingsFx`, `updateSettingsFx`), stores (`$reminderSettings`, `$isSettingsLoading`), samples connecting settings load to app init for authenticated users
- [ ] T030 [US3] Create `frontend/src/features/notificationSettings/ui/ReminderSettings/ReminderSettings.tsx`: toggle вкл/выкл (triggers push subscription if first time), interval chips (5/10/15/30/60 min) with add/remove, toggle «Не беспокоить во время урока», use `useUnit` for all state
- [ ] T031 [US3] Create `frontend/src/features/notificationSettings/ui/ReminderSettings/ReminderSettings.styled.ts`: styled-components for settings section
- [ ] T032 [US3] Create `frontend/src/features/notificationSettings/ui/ReminderSettings/index.ts` and `frontend/src/features/notificationSettings/ui/index.ts` and `frontend/src/features/notificationSettings/index.ts`: re-exports
- [ ] T033 [US3] Add «Напоминания об уроках» section to `frontend/src/pages/profile/ProfilePage.tsx`: render `ReminderSettings` component below existing profile fields. Show message about notification permission status if denied

### Tests for User Story 3

- [ ] T034 [P] [US3] Backend tests for reminder settings in `backend/src/__tests__/reminderSettings.test.ts`: test GET (lazy create), PUT (valid intervals, invalid intervals 400, duplicates 400, auto-set [30] on enable with empty, muteWhenInLesson toggle). Use Supertest + real DB
- [ ] T035 [P] [US3] Frontend tests for ReminderSettings component in `frontend/src/features/notificationSettings/ui/ReminderSettings/__tests__/ReminderSettings.test.tsx`: test toggle rendering, interval add/remove, «Не беспокоить» toggle, permission denied message. Use RTL + MSW
- [ ] T036 [P] [US3] Frontend tests for settings logic in `frontend/src/entities/notifications/__tests__/notifications.settings.test.ts`: test loadSettingsFx, updateSettingsFx, auto-enable subscription on first enable. Use Effector `fork`

**Checkpoint**: Full settings management works. All tests pass. Settings persist across page reloads. Push subscription triggered on first enable

---

## Phase 6: User Story 4 — Получение напоминания перед уроком (Priority: P1)

**Goal**: Репетитор получает push-уведомление за заданное количество минут до урока. Нажатие открывает приложение

**Independent Test**: Создать урок через 2 минуты, установить напоминание за 1 минуту → получить push → нажать → приложение открывается на странице уроков

**Dependencies**: Requires US2 (subscription) and US3 (settings) to be complete

### Implementation for User Story 4

- [ ] T037 [US4] Create `backend/src/services/pushNotification.ts`: function `sendPushToUser(userId, payload)` — find all `PushSubscription` for user, send via `web-push.sendNotification()`, handle 410/404 errors (delete stale subscriptions), configure `web-push.setVapidDetails()` on init. Notification title: «Урок через {N} минут» (or «Урок через 1 час» for 60). Body: «{Subject} ({LessonType}) — {StudentName}, {HH:MM}–{HH:MM}»
- [ ] T038 [US4] Create `backend/src/services/reminderScheduler.ts`: function `scheduleRemindersForLesson(lessonId)` — load lesson + user's `ReminderSettings`, create `ScheduledReminder` records for each interval (skip if `scheduledAt` in past). Function `cancelRemindersForLesson(lessonId)` — set PENDING reminders to CANCELLED. Function `recalculateRemindersForUser(userId)` — cancel all PENDING, recreate for future lessons
- [ ] T039 [US4] Create `backend/src/services/reminderProcessor.ts`: function `processScheduledReminders()` — find PENDING reminders with `scheduledAt <= now`, for each: check lesson status (only SCHEDULED/RESCHEDULED), check `muteWhenInLesson` (query if user has lesson with `startTime <= now < endTime`), send push via `sendPushToUser`, mark as SENT. Cancel reminders for lessons not in SCHEDULED/RESCHEDULED
- [ ] T040 [US4] Register cron job in `backend/src/index.ts`: `cron.schedule("* * * * *", processScheduledReminders)` with try-catch, same pattern as existing `updateLessonStatuses`
- [ ] T041 [US4] Add reminder side-effects to `backend/src/controllers/lessons/createLesson.ts`: after successful creation of lesson with status SCHEDULED, call `scheduleRemindersForLesson(lesson.id)`
- [ ] T042 [US4] Add reminder side-effects to `backend/src/controllers/lessons/updateLesson.ts`: if `startTime`/`endTime`/`status` changed, call `cancelRemindersForLesson` then `scheduleRemindersForLesson` (only if new status is SCHEDULED/RESCHEDULED)
- [ ] T043 [US4] Add recalculation trigger to `backend/src/controllers/reminderSettings/updateReminderSettings.ts`: when `enabled` or `intervals` change, call `recalculateRemindersForUser(userId)`. When `enabled` set to false, cancel all PENDING reminders

### Tests for User Story 4

- [ ] T044 [P] [US4] Backend tests for pushNotification service in `backend/src/__tests__/pushNotification.test.ts`: test `sendPushToUser` sends to all subscriptions, test stale subscription cleanup on 410/404, test notification text formatting (Russian). Mock `web-push.sendNotification`
- [ ] T045 [P] [US4] Backend tests for reminderScheduler in `backend/src/__tests__/reminderScheduler.test.ts`: test `scheduleRemindersForLesson` creates correct reminders per user intervals, test skips past scheduledAt, test `cancelRemindersForLesson` sets CANCELLED, test `recalculateRemindersForUser`. Use real DB
- [ ] T046 [P] [US4] Backend tests for reminderProcessor in `backend/src/__tests__/reminderProcessor.test.ts`: test processes PENDING reminders at scheduledAt, test skips cancelled/completed lessons, test `muteWhenInLesson` suppresses during active lesson, test marks SENT after delivery. Use real DB, mock web-push
- [ ] T047 [P] [US4] Backend tests for lesson controller side-effects in `backend/src/__tests__/lessonReminders.test.ts`: test createLesson creates reminders, test updateLesson recalculates on time change, test updateLesson cancels on status CANCELLED. Use Supertest + real DB

**Checkpoint**: End-to-end reminder flow works. All tests pass. Cron finds pending reminders, sends push, marks as sent. Cancelled lessons don't generate notifications. «Не беспокоить» suppresses during active lesson

---

## Phase 7: User Story 5 — Базовая работа без сети (Priority: P2)

**Goal**: Приложение открывается без интернета, показывает кешированное состояние и индикатор офлайн-режима

**Independent Test**: Загрузить приложение → отключить интернет → перезапустить приложение → открывается без ошибки, показывает «Нет подключения к интернету»

### Implementation for User Story 5

- [ ] T048 [US5] Add basic cache strategy to `frontend/public/push-sw.js`: cache app shell on install (index.html, main JS/CSS bundles, manifest.json, icons), serve from cache on fetch when offline (network-first with cache fallback for navigation)
- [ ] T049 [US5] Add online/offline detection to `frontend/src/app/model/app-init.model.ts`: listen to `window.addEventListener('online'/'offline')`, store `$isOnline`, event `onlineStatusChanged`
- [ ] T050 [US5] Add offline indicator to `frontend/src/app/App.tsx`: show `Snackbar` or `Alert` with «Нет подключения к интернету. Данные могут быть неактуальны» when `$isOnline` is false, auto-dismiss when back online

### Tests for User Story 5

- [ ] T051 [US5] Frontend tests for offline indicator in `frontend/src/app/__tests__/offline-indicator.test.tsx`: test shows message when offline, test hides when online restored. Use RTL

**Checkpoint**: App loads without network error when offline. All tests pass. Shows offline indicator. Indicator disappears when connection restores

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, changelog, and news entry

- [ ] T052 Run `npm run lint` in `frontend/` — fix any ESLint errors
- [ ] T053 [P] Run `npx tsc --noEmit` in `frontend/` — fix any TypeScript errors
- [ ] T054 [P] Run `npm run build` in `backend/` — fix any TypeScript errors
- [ ] T055 [P] Run `npm run find-cycle` in `frontend/` — fix any circular dependencies
- [ ] T056 [P] Run `npm test` in `backend/` — all tests pass
- [ ] T057 [P] Run `npm test` in `frontend/` — all tests pass
- [ ] T058 Verify push notification flow end-to-end: install PWA → enable reminders → create lesson → receive notification → click → app opens on lessons page
- [ ] T059 Run `/changelog` to update CHANGELOG.md with changes from current branch
- [ ] T060 Run `/news` to generate user-facing news entry from changelog

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001-T005 complete)
- **US1 (Phase 3)**: Depends on Phase 2. No dependency on other stories
- **US2 (Phase 4)**: Depends on Phase 2. Independent of US1 (but benefits from SW registration in US1)
- **US3 (Phase 5)**: Depends on Phase 2 + US2 (needs subscription flow for first-time enable)
- **US4 (Phase 6)**: Depends on US2 + US3 (needs subscriptions and settings to send reminders)
- **US5 (Phase 7)**: Depends on Phase 2. Independent of US2-US4
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundation) → US1 (PWA install)
                                        → US2 (Subscription) → US3 (Settings) → US4 (Reminders)
                                        → US5 (Offline)
```

### Within Each User Story

- Models/schemas before services
- Services before controllers
- Controllers before routes
- Backend before frontend (API must exist before UI calls it)
- Implementation before tests (tests verify working code)
- Core implementation before integration with other stories

### Parallel Opportunities

**Phase 1**: T002, T003 can run in parallel after T001
**Phase 2**: T007, T008, T009 can run in parallel (different files)
**Phase 3**: T010, T011 can run in parallel
**Phase 4**: T013, T014, T015, T016 (controllers) in parallel; T022, T023 (tests) in parallel
**Phase 5**: T024, T025 (controllers) in parallel; T034, T035, T036 (tests) in parallel
**Phase 6**: T044, T045, T046, T047 (tests) in parallel
**Phase 7**: T048, T049 can run in parallel (SW vs app model)
**Phase 8**: T053, T054, T055, T056, T057 can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 3)

1. Complete Phase 1: Setup (install, migrate, VAPID)
2. Complete Phase 2: Foundational (types, API module, SW shell)
3. Complete Phase 3: US1 — PWA installable
4. Complete Phase 4: US2 — Push subscription works + tests
5. Complete Phase 5: US3 — Settings UI in profile + tests
6. **STOP and VALIDATE**: App installable, subscription works, settings save, all tests pass
7. Deploy — users can already install PWA and configure reminders

### Full Delivery

8. Complete Phase 6: US4 — Actual reminders sent via cron + tests
9. Complete Phase 7: US5 — Offline mode + tests
10. Complete Phase 8: Polish — lint, types, cycles, all tests, changelog, news

### Incremental Delivery

Each phase adds testable value:
- After Phase 3: PWA installable on devices ✓
- After Phase 5: Full settings management + subscription ✓
- After Phase 6: Actual push reminders working ✓
- After Phase 7: Offline resilience ✓
- After Phase 8: Changelog + news entry for users ✓

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Backend error messages in Russian (project convention)
- Follow existing patterns: news feature for FSD, lessonStatusUpdater for cron
- Read convention files before implementing: `docs/conventions/frontend.md`, `docs/conventions/backend.md`
- Read test conventions before writing tests: `docs/conventions/frontend-testing.md`, `docs/conventions/backend-testing.md`
- Service worker file is plain JS (not TypeScript) — runs outside React app context
- VAPID keys must be identical across .env and .env.test for test consistency
- Before creating PR: always run `/changelog` then `/news`
