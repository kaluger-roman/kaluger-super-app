# Tasks: Смена пароля и email

**Input**: Design documents from `/specs/023-change-password-email/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Included — CLAUDE.md requires full test coverage for all new code.

**Organization**: Tasks grouped by user story (US1: Смена пароля, US2: Смена email).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and shared type definitions needed by both user stories

- [x] T001 Add `pendingEmail String?` field to User model in `backend/prisma/schema.prisma` and run Prisma migration
- [x] T002 Add ChangePasswordDto and ChangeEmailDto types to `backend/src/types/index.ts`

---

## Phase 2: User Story 1 — Смена пароля (Priority: P1) MVP

**Goal**: Авторизованный пользователь может сменить пароль через страницу профиля, указав текущий и новый пароль

**Independent Test**: Ввести текущий и новый пароль на странице профиля. Успешная смена подтверждается возможностью войти с новым паролем

### Backend — US1

- [x] T003 [US1] Create changePassword service with password verification, validation, and update logic in `backend/src/services/changePassword.ts`
- [x] T004 [US1] Create changePassword controller with request validation in `backend/src/controllers/changePassword.ts`
- [x] T005 [US1] Add `POST /api/auth/change-password` route to `backend/src/routes/auth.ts`
- [x] T006 [P] [US1] Write unit tests for changePassword service in `backend/src/services/__tests__/changePassword.test.ts`
- [x] T007 [P] [US1] Write integration tests for changePassword controller in `backend/src/controllers/__tests__/changePassword.test.ts`

### Frontend — US1

- [x] T008 [P] [US1] Add `changePassword` API method to `frontend/src/shared/api/auth.ts`
- [x] T009 [US1] Create changePassword Effector model (stores, events, effect) in `frontend/src/features/changePassword/models/changePassword.model.ts`
- [x] T010 [P] [US1] Create ChangePasswordForm styled components in `frontend/src/features/changePassword/ui/ChangePasswordForm.styles.ts`
- [x] T011 [US1] Create ChangePasswordForm component (3 fields: current, new, confirm + submit button) in `frontend/src/features/changePassword/ui/ChangePasswordForm.tsx`
- [x] T012 [US1] Create barrel export in `frontend/src/features/changePassword/index.ts`
- [x] T013 [US1] Integrate ChangePasswordForm section into ProfilePage in `frontend/src/pages/profile/ProfilePage.tsx`
- [x] T014 [P] [US1] Write tests for changePassword Effector model in `frontend/src/features/changePassword/models/__tests__/changePassword.model.test.ts`

**Checkpoint**: Смена пароля полностью работает — можно протестировать независимо от US2

---

## Phase 3: User Story 2 — Смена email (Priority: P2)

**Goal**: Авторизованный пользователь может сменить email через двухэтапный процесс: ввод нового email + подтверждение 6-значным кодом

**Independent Test**: Ввести новый email и пароль, получить код на новый адрес, ввести код. Успешная смена подтверждается отображением нового email в профиле и возможностью входа с ним

### Backend — US2

- [x] T015 [US2] Create changeEmail service with initiate, verify, and resend logic in `backend/src/services/changeEmail.ts`
- [x] T016 [US2] Create changeEmail controller with request validation for all 3 endpoints in `backend/src/controllers/changeEmail.ts`
- [x] T017 [US2] Add `POST /api/auth/change-email`, `POST /api/auth/verify-email-change`, `POST /api/auth/resend-email-change-code` routes to `backend/src/routes/auth.ts`
- [x] T018 [P] [US2] Write unit tests for changeEmail service in `backend/src/services/__tests__/changeEmail.test.ts`
- [x] T019 [P] [US2] Write integration tests for changeEmail controller in `backend/src/controllers/__tests__/changeEmail.test.ts`

### Frontend — US2

- [x] T020 [P] [US2] Add `changeEmail`, `verifyEmailChange`, `resendEmailChangeCode` API methods to `frontend/src/shared/api/auth.ts`
- [x] T021 [US2] Create changeEmail Effector model (stores, events, effects for initiate + verify + resend + timer) in `frontend/src/features/changeEmail/models/changeEmail.model.ts`
- [x] T022 [P] [US2] Create ChangeEmailForm styled components in `frontend/src/features/changeEmail/ui/ChangeEmailForm.styles.ts`
- [x] T023 [US2] Create ChangeEmailForm component (email + password form, code input form, resend timer) in `frontend/src/features/changeEmail/ui/ChangeEmailForm.tsx`
- [x] T024 [US2] Create barrel export in `frontend/src/features/changeEmail/index.ts`
- [x] T025 [US2] Integrate ChangeEmailForm section into ProfilePage in `frontend/src/pages/profile/ProfilePage.tsx`
- [x] T026 [P] [US2] Write tests for changeEmail Effector model in `frontend/src/features/changeEmail/models/__tests__/changeEmail.model.test.ts`

**Checkpoint**: Обе функции полностью работают — смена пароля и смена email независимы друг от друга

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T027 Run full backend test suite (`npm test` in `backend/`) and fix any failures
- [x] T028 Run full frontend test suite (`npm test` in `frontend/`) and fix any failures
- [x] T029 Run frontend lint (`npm run lint` in `frontend/`) and fix any issues
- [x] T030 Run backend build (`npm run build` in `backend/`) and fix any TypeScript errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 completion
- **US2 (Phase 3)**: Depends on Phase 1 completion; independent of US1
- **Polish (Phase 4)**: Depends on Phases 2 and 3

### Within User Story 1

- T003 (service) → T004 (controller) → T005 (route) — sequential
- T006, T007 — parallel, after T003–T005 complete
- T008 (API method) — parallel with backend tasks
- T009 (model, depends on T008) → T011 (component, depends on T009 + T010) → T012 (barrel) → T013 (integration)
- T010 (styles) — parallel with T009
- T014 (model tests) — after T009

### Within User Story 2

- T015 (service) → T016 (controller) → T017 (routes) — sequential
- T018, T019 — parallel, after T015–T017 complete
- T020 (API methods) — parallel with backend tasks
- T021 (model, depends on T020) → T023 (component, depends on T021 + T022) → T024 (barrel) → T025 (integration)
- T022 (styles) — parallel with T021
- T026 (model tests) — after T021

### Parallel Opportunities

```bash
# Phase 1 — sequential (T001 → T002)

# Phase 2 — backend and frontend API can start in parallel:
Task T003–T005 (backend sequential)
Task T008 (frontend API, parallel with backend)
Task T010 (styles, parallel with T009)
Task T006, T007 (backend tests, parallel after T005)
Task T014 (frontend model tests, parallel after T009)

# Phase 3 — same pattern as Phase 2:
Task T015–T017 (backend sequential)
Task T020 (frontend API, parallel with backend)
Task T022 (styles, parallel with T021)
Task T018, T019 (backend tests, parallel after T017)
Task T026 (frontend model tests, parallel after T021)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration + types)
2. Complete Phase 2: User Story 1 — Смена пароля
3. **STOP and VALIDATE**: Test password change independently
4. Deploy/demo if ready

### Incremental Delivery

1. Phase 1: Setup → Foundation ready
2. Phase 2: US1 Смена пароля → Test → Deploy (MVP!)
3. Phase 3: US2 Смена email → Test → Deploy
4. Phase 4: Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [US1/US2] label maps task to specific user story
- Both stories are independently testable
- Backend uses existing bcryptjs for password hashing, existing email service (Resend) for verification
- Frontend reuses existing password validation regex from auth feature
- Verification code logic reuses existing `verificationCode`/`verificationCodeExpiry` fields
- JWT remains valid after password change; new JWT issued after email change
