# Tasks: Налоговая информация на дашборде статистики

**Input**: Design documents from `/specs/006-tax-statistics/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Включены — спецификация требует тестирование (Constitution principle VI).

**Organization**: Tasks grouped by user story. US1 и US2 оба P1, но US2 (настройка ставки) — prerequisite для US1 (отображение на дашборде), поэтому US2 идёт первым.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Database & Types)

**Purpose**: Миграция БД и обновление типов — фундамент для обеих user stories

- [x] T001 Add `taxRate Float @default(6.0)` field to User model in `backend/prisma/schema.prisma`
- [x] T002 Run Prisma migration and generate client (`npm run db:migrate` + `npm run db:generate` + `npm run db:migrate:test` in `backend/`)
- [x] T003 [P] Add `taxRate` to backend User-related types and add `taxAmount` to Statistics type in `backend/src/types/index.ts`
- [x] T004 [P] Add `taxRate` to frontend User type and add `taxAmount` to frontend Statistics type in `frontend/src/shared/types/index.ts`

---

## Phase 2: Foundational (Backend Profile Endpoint)

**Purpose**: Расширение эндпоинта профиля для сохранения/возврата taxRate — блокирует обе user stories

**CRITICAL**: Без этой фазы ни US1 (расчёт на сервере использует taxRate), ни US2 (редактирование ставки) не работают.

- [x] T005 Extend `updateProfile` to accept and validate optional `taxRate` (0–100) in `backend/src/controllers/auth.ts`
- [x] T006 Add `taxRate: true` to `select` in all User queries (getProfile, updateProfile, register, verifyEmail, login) in `backend/src/controllers/auth.ts` and `backend/src/controllers/emailVerification.ts`
- [x] T007 Extend `authApi.updateProfile` to accept optional `taxRate` parameter in `frontend/src/shared/api/auth.ts`

**Checkpoint**: Profile API returns and accepts taxRate. Foundation ready for user stories.

---

## Phase 3: User Story 2 — Настройка ставки налога в профиле (Priority: P1)

**Goal**: Репетитор может просматривать и изменять ставку налога на странице профиля.

**Independent Test**: Открыть профиль, увидеть текущую ставку (6% по умолчанию), изменить на 13%, сохранить, перезагрузить — ставка сохранена.

### Implementation for User Story 2

- [x] T008 [US2] Add `$taxRate` store, `taxRateChanged` event, extend `updateProfileFx` to send `{ name, taxRate }` in `frontend/src/pages/profile/models/profile.model.ts`
- [x] T009 [US2] Add tax rate TextField (type="number", 0–100, step 0.1) to profile edit form in `frontend/src/pages/profile/ProfilePage.tsx`

### Tests for User Story 2

- [x] T010 [P] [US2] Add backend tests: updateProfile with valid taxRate, invalid taxRate (<0, >100), default taxRate on new user in `backend/src/controllers/__tests__/auth.test.ts`
- [x] T011 [P] [US2] Add frontend tests: taxRate store initialization, change, save, validation in `frontend/src/pages/profile/models/__tests__/profile.model.test.ts`

**Checkpoint**: Tax rate is editable in profile, persisted in DB, returned in API responses.

---

## Phase 4: User Story 1 — Отображение налогов на дашборде статистики (Priority: P1)

**Goal**: Карточка «Налоги» на странице статистики показывает сумму = заработок × ставка / 100.

**Independent Test**: Создать уроки с известными ценами, открыть статистику — карточка налога показывает верную сумму.

### Implementation for User Story 1

- [x] T012 [US1] Add user taxRate query to `Promise.all` and calculate `taxAmount = Math.round(earnings * taxRate / 100)` in response in `backend/src/controllers/statistics/getStatistics.ts`
- [x] T013 [US1] Add tax amount card to financial statistics grid in `frontend/src/pages/ReportsPage/components/FinancialStatistics/FinancialStatistics.tsx`

### Tests for User Story 1

- [x] T014 [P] [US1] Add backend tests: getStatistics returns taxAmount with default rate, custom rate, zero earnings in `backend/src/controllers/statistics/__tests__/getStatistics.test.ts`
- [x] T015 [P] [US1] Add frontend test: FinancialStatistics renders tax card with taxAmount in `frontend/src/pages/ReportsPage/components/FinancialStatistics/__tests__/FinancialStatistics.test.tsx`

**Checkpoint**: Tax amount displayed on dashboard, calculated server-side with user's personal rate.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Валидация качества, lint, typecheck

- [x] T016 Run backend quality gates: `npm run lint`, `npx tsc --noEmit`, `npm test` in `backend/`
- [x] T017 Run frontend quality gates: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run find-cycle` in `frontend/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001–T002 must complete for Prisma types)
- **Phase 3 (US2 — Profile)**: Depends on Phase 2 (needs profile API changes)
- **Phase 4 (US1 — Dashboard)**: Depends on Phase 2 (needs taxRate in DB and types)
- **Phase 5 (Polish)**: Depends on Phases 3 and 4

### User Story Dependencies

- **US2 (Profile)**: Can start after Phase 2. No dependency on US1.
- **US1 (Dashboard)**: Can start after Phase 2. No dependency on US2.
  - Note: US1 and US2 can run in parallel after Phase 2.

### Within Each Phase

- T001 → T002 (migration before generate)
- T003, T004 can run in parallel with T002 (different packages)
- T005 → T006 (validation before select expansion)
- T008 → T009 (model before UI)
- T010, T011 parallel (different packages)
- T014, T015 parallel (different packages)

### Parallel Opportunities

```text
After T002 completes:
  ├── T003 (backend types) ─── parallel ─── T004 (frontend types)

After Phase 2:
  ├── US2: T008 → T009, then T010 ║ T011
  ├── US1: T012 → T013, then T014 ║ T015
  └── (US1 and US2 can run in parallel)
```

---

## Implementation Strategy

### MVP First (Both Stories = MVP)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T007)
3. Complete Phase 3: US2 — Profile (T008–T011)
4. Complete Phase 4: US1 — Dashboard (T012–T015)
5. Complete Phase 5: Polish (T016–T017)
6. **VALIDATE**: Both stories independently testable

### Incremental Delivery

1. Setup + Foundational → DB и API готовы
2. US2 (Profile) → Репетитор может задать ставку → Демо
3. US1 (Dashboard) → Налог отображается на дашборде → Демо
4. Polish → Качество подтверждено

---

## Notes

- [P] tasks = different files/packages, no dependencies
- US1 and US2 both P1, but logically US2 first (need rate before calculating tax)
- Backend and frontend tasks within the same story can run in parallel (different packages)
- All test file paths follow existing project conventions
- 17 tasks total, ~12 files modified
