# Tasks: Фильтрация уроков по дате оплаты

**Input**: Design documents from `/specs/024-lesson-payment-filter/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/get-lessons.md, quickstart.md

**Organization**: Tasks grouped by user story. Each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Backend endpoint extension, Effector model foundation, API client types, and data flow wiring — required by ALL user stories

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete

- [x] T001 [P] Extend getLessons controller with `paymentDateFrom`/`paymentDateTo` query params: destructure from req.query, add Prisma `where.paymentDate` filtering (NOT NULL + gte/lte with day boundaries), skip when `onlyUnpaid=true`, validate from<=to (400 error) in `backend/src/controllers/lessons/getLessons.ts`
- [x] T002 [P] Add `paymentDateFrom?: string` and `paymentDateTo?: string` to `LessonsFilters` type and pass them in `getUpcoming`, `getByWeek`, `getAll` methods in `frontend/src/shared/api/lessons.ts`
- [x] T003 [P] Add Effector stores `$paymentDateFrom` (Date|null), `$paymentDateTo` (Date|null), events `setPaymentDateFrom`, `setPaymentDateTo`, `resetPaymentDateFilter`, and corresponding sample bindings in `frontend/src/features/lessons/models/lessons-filters.model.ts`
- [x] T004 [P] Add `paymentDateFrom`/`paymentDateTo` (Date|null) to `LoadParams` and `WeeklyParams` types, include them in `createPagedLessonParams` and `createWeeklyLessonParams` return values (convert to ISO string or omit if null) in `frontend/src/features/lessons/models/lessons-page-loader.helpers.ts`
- [x] T005 Wire `$paymentDateFrom` and `$paymentDateTo` into `clock` and `source` of all samples in `frontend/src/features/lessons/models/lessons-page-loader.model.ts` (weekly, schedule, paged×3 samples)
- [x] T006 Wire `$paymentDateFrom` and `$paymentDateTo` into `source` of all reload samples (addLesson, updateLesson, removeLesson) in `frontend/src/features/lessons/models/lessons-reload.model.ts`

**Checkpoint**: Backend accepts paymentDate filters, frontend model propagates them to API calls. No UI yet but data flow is complete.

---

## Phase 2: User Story 1 — Фильтрация по диапазону дат оплаты (Priority: P1) 🎯 MVP

**Goal**: Репетитор может задать диапазон дат оплаты (начало/конец) и увидеть только уроки, оплаченные в этот период.

**Independent Test**: Задать диапазон дат → увидеть только уроки с paymentDate в этом диапазоне. Сбросить → увидеть все уроки.

### Implementation for User Story 1

- [x] T007 [US1] Add two `DatePicker` components («Оплата с» / «Оплата по») and a reset button to `LessonsFilters`: wire to `setPaymentDateFrom`/`setPaymentDateTo`/`resetPaymentDateFilter` via `useUnit`, render only in paged/weekly view modes in `frontend/src/pages/lessons/components/LessonsFilters/LessonsFilters.tsx`

### Tests for User Story 1

- [x] T008 [P] [US1] Backend test: verify getLessons with `paymentDateFrom`/`paymentDateTo` returns correct lessons (full range, partial range from-only, partial range to-only, empty results, invalid range → 400) in `backend/src/__tests__/lessons-payment-filter.test.ts`
- [x] T009 [P] [US1] Frontend test: verify `$paymentDateFrom`/`$paymentDateTo` stores update on events, `resetPaymentDateFilter` clears both stores, filter params are passed to load effects using fork/allSettled in `frontend/src/features/lessons/models/__tests__/lessons-filters.model.test.ts`

**Checkpoint**: User Story 1 fully functional — date range filtering works end-to-end.

---

## Phase 3: User Story 2 — Комбинирование с существующими фильтрами (Priority: P2)

**Goal**: Фильтр по дате оплаты корректно комбинируется с другими фильтрами. При включении «Только неоплаченные» — фильтр дат автоматически сбрасывается.

**Independent Test**: Задать диапазон дат → включить «Только неоплаченные» → даты сброшены, DatePicker disabled. Выключить → DatePicker снова доступен.

### Implementation for User Story 2

- [x] T010 [US2] Add mutual exclusion sample: when `setOnlyUnpaid(true)` fires, reset `$paymentDateFrom`, `$paymentDateTo`, `$paymentDatePreset` to null in `frontend/src/features/lessons/models/lessons-filters.model.ts`
- [x] T011 [US2] Add `disabled` prop to DatePicker components when `onlyUnpaid=true` (read from `$onlyUnpaid` via `useUnit`) in `frontend/src/pages/lessons/components/LessonsFilters/LessonsFilters.tsx`

### Tests for User Story 2

- [x] T012 [P] [US2] Backend test: verify that `onlyUnpaid=true` with `paymentDateFrom`/`paymentDateTo` ignores payment date filters in `backend/src/__tests__/lessons-payment-filter.test.ts`
- [x] T013 [P] [US2] Frontend test: verify that `setOnlyUnpaid(true)` resets `$paymentDateFrom`/`$paymentDateTo` to null using fork/allSettled in `frontend/src/features/lessons/models/__tests__/lessons-filters.model.test.ts`

**Checkpoint**: User Stories 1 AND 2 work independently. Mutual exclusion prevents conflicting filters.

---

## Phase 4: User Story 3 — Предустановленные периоды (Priority: P3)

**Goal**: Репетитор может одним кликом выбрать «Текущий месяц», «Прошлый месяц» или «Текущая неделя» для быстрого заполнения дат.

**Independent Test**: Клик на чип «Текущий месяц» → поля дат заполнены первым и последним днём текущего месяца. Ручное изменение даты → чип деактивирован.

### Implementation for User Story 3

- [x] T014 [US3] Add `$paymentDatePreset` store (PaymentDatePreset type = `"currentMonth" | "lastMonth" | "currentWeek" | null`), `setPaymentDatePreset` event, sample for preset→dates calculation (startOfMonth/endOfMonth, startOfWeek/endOfWeek logic), and sample to reset preset on manual `setPaymentDateFrom`/`setPaymentDateTo` in `frontend/src/features/lessons/models/lessons-filters.model.ts`
- [x] T015 [US3] Add MUI `Chip` components for preset periods («Текущий месяц», «Прошлый месяц», «Текущая неделя»): highlight active chip based on `$paymentDatePreset`, wire onClick to `setPaymentDatePreset`, disabled when `onlyUnpaid=true` in `frontend/src/pages/lessons/components/LessonsFilters/LessonsFilters.tsx`

### Tests for User Story 3

- [x] T016 [P] [US3] Frontend test: verify `setPaymentDatePreset("currentMonth")` sets correct dates, manual `setPaymentDateFrom` resets `$paymentDatePreset` to null, `setOnlyUnpaid(true)` resets preset using fork/allSettled in `frontend/src/features/lessons/models/__tests__/lessons-filters.model.test.ts`

**Checkpoint**: All 3 user stories fully functional and independently testable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, validation, cleanup

- [x] T017 Run TypeScript type check: `npx tsc --noEmit` in `backend/` and `frontend/`
- [x] T018 Run linting: `npm run lint` in `frontend/` and `backend/`
- [x] T019 Run all tests: `npm test` in `frontend/` and `npm test` in `backend/`
- [x] T020 Run circular dependency check: `npm run find-cycle` in `frontend/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. T001-T004 run in parallel, then T005-T006.
- **US1 (Phase 2)**: Depends on Phase 1 completion. T007 first, then T008-T009 in parallel.
- **US2 (Phase 3)**: Depends on Phase 2 (needs DatePickers to exist for disabled state). T010-T011 sequential, T012-T013 in parallel.
- **US3 (Phase 4)**: Depends on Phase 2 (needs DatePickers + filter model). T014→T015, then T016.
- **Polish (Phase 5)**: Depends on all phases. T017-T020 sequential.

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 1 (Foundational). No other story dependencies. **This is the MVP.**
- **US2 (P2)**: Depends on US1 (needs DatePicker UI to add disabled state). Adds mutual exclusion.
- **US3 (P3)**: Depends on US1 (needs DatePicker UI to add preset chips alongside). Adds presets.

### Within Each Phase

```
Phase 1: T001 ──┐
         T002 ──┤ (parallel)
         T003 ──┤
         T004 ──┘──→ T005 ─┐ (parallel)
                     T006 ─┘

Phase 2: T007 ──→ T008 ─┐ (parallel)
                  T009 ─┘

Phase 3: T010 → T011 → T012 ─┐ (parallel)
                        T013 ─┘

Phase 4: T014 → T015 → T016

Phase 5: T017 → T018 → T019 → T020
```

### Parallel Opportunities

**Phase 1** (4 parallel tasks):
```
T001: backend/src/controllers/lessons/getLessons.ts
T002: frontend/src/shared/api/lessons.ts
T003: frontend/src/features/lessons/models/lessons-filters.model.ts
T004: frontend/src/features/lessons/models/lessons-page-loader.helpers.ts
```

**Phase 2** (2 parallel test tasks):
```
T008: backend/src/__tests__/lessons-payment-filter.test.ts
T009: frontend/src/features/lessons/models/__tests__/lessons-filters.model.test.ts
```

**Phase 3** (2 parallel test tasks):
```
T012: backend test (same file as T008, new test cases)
T013: frontend test (same file as T009, new test cases)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001-T006)
2. Complete Phase 2: US1 — DatePicker UI + tests (T007-T009)
3. **STOP and VALIDATE**: Фильтрация по дате оплаты работает end-to-end
4. Deploy if ready — базовая фильтрация уже приносит ценность

### Incremental Delivery

1. Phase 1 (Foundation) → data flow wired
2. Phase 2 (US1) → date range filtering works → Deploy/Demo (MVP!)
3. Phase 3 (US2) → mutual exclusion with onlyUnpaid → Deploy/Demo
4. Phase 4 (US3) → preset periods for quick selection → Deploy/Demo
5. Phase 5 (Polish) → quality gates pass

---

## Notes

- Миграция БД НЕ требуется — поле `paymentDate` уже существует
- Все изменения в СУЩЕСТВУЮЩИХ файлах (кроме тестовых файлов)
- Тесты добавлены per constitution Principle VI (Testing Discipline)
- [P] tasks = different files, no dependencies on incomplete prior tasks
- Commit after each phase checkpoint
