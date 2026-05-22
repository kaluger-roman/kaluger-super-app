# E2E Check — 029-student-cabinet — 2026-05-20

**Diff base:** `main`
**Изменённых файлов:** 203 (user-facing: ~28 — новые pages/features/routes/controllers/services + изменённые формы и endpoints)
**Существующих e2e:** 0 (директория `frontend/e2e/` содержит только README и пуста по spec-файлам)

## Резюме

Стартовое состояние — e2e ещё не писались. PR #48 вводит **целую новую под-систему** (Student Cabinet: invite → registration → login → расписание → settings → real-time), полностью отделённую от tutor flow. Главный риск — критичные пользовательские пути (онбординг ученика через инвайт, login по toggle, просмотр расписания) проходят без сетевой проверки целостности; backend integration-тесты их частично закрывают, но интеграция UI ↔ API ↔ WS ↔ DB не покрыта.

## Uncovered (новое без e2e)

- **[auth]** Новый роут `/student-invite/:token` — `frontend/src/pages/studentInvite/StudentInvitePage.tsx`
  Журнал: ученик открывает ссылку → форма (ФИО, email, пароль, подтверждение) → регистрация → редирект в кабинет.
  Черновик: `frontend/e2e/auth/student-invite-registration.draft.spec.ts` ✅ создан
- **[auth]** `/student-invite/:token` с инвалидным/использованным токеном — тот же файл, ветка «ссылка недействительна»
  Черновик: `frontend/e2e/auth/student-invite-expired-token.draft.spec.ts` ✅ создан
- **[auth]** Переключатель Преподаватель/Ученик в `LoginForm` — `frontend/src/features/auth/ui/LoginForm/LoginForm.tsx:62-77`
  Журнал: ученик переключает роль → вводит email/password → редирект на `/student/cabinet/schedule`.
  Cross-role регрессия: пароль ученика не должен открывать tutor-flow.
  Черновик: `frontend/e2e/auth/student-login-via-toggle.draft.spec.ts` ✅ создан
- **[auth]** Подтверждение email на cabinet — `frontend/src/features/studentAuth/ui/StudentEmailVerificationForm/StudentEmailVerificationForm.tsx`
  Журнал: баннер на cabinet → ввод 6-значного кода → подтверждение / отправка повторно с cooldown.
  Черновик: `frontend/e2e/auth/student-email-verification.draft.spec.ts` ✅ создан
- **[students]** Новый блок InvitationManager в карточке ученика у тьютора — `frontend/src/features/tutorStudentInvitation/ui/InvitationManager/InvitationManager.tsx`
  Журнал: тьютор открывает карточку → выпускает ссылку → копирует / повторно выпускает / отзывает.
  Черновик: `frontend/e2e/students/tutor-issues-student-invitation.draft.spec.ts` ✅ создан
- **[lessons]** Новый роут `/student/cabinet/schedule` — `frontend/src/pages/studentSchedule/StudentSchedulePage.tsx` + `frontend/src/features/studentSchedule/ui/StudentWeeklyView/StudentWeeklyView.tsx`
  Журнал: ученик видит только свои уроки (cross-tenant isolation), навигация по неделям, на карточке только разрешённые поля.
  Черновик: `frontend/e2e/lessons/student-views-own-schedule.draft.spec.ts` ✅ создан
- **[lessons]** Новый роут `/student/cabinet/settings` — `frontend/src/pages/studentSettings/StudentSettingsPage.tsx`
  Журнал: ученик видит имя/email/статус верификации/имя учителя; placeholder «Связь с преподавателем прекращена» когда student=null.
  Черновик: `frontend/e2e/lessons/student-cabinet-settings.draft.spec.ts` ✅ создан
- **[pwa]** Real-time обновление расписания через `/ws/student` — `frontend/src/app/model/student-web-socket.model.ts` + backend broadcasts
  Журнал: тьютор создаёт/удаляет урок → у ученика расписание обновляется без перезагрузки.
  Черновик: `frontend/e2e/pwa/student-realtime-lesson-updates.draft.spec.ts` ✅ создан

## Possibly affected (изменения в покрытом flow)

Нет — существующих e2e нет, нечего affected'ить. Однако стоит иметь в виду:

- `frontend/src/features/auth/ui/LoginForm/LoginForm.tsx` — добавлен toggle и role-aware submit. Когда появятся tutor-login e2e, их сценарий тоже должен проходить корректно при дефолтном `loginRole === "tutor"`.
- `backend/src/controllers/lessons/{createLesson,updateLesson,deleteLesson}.ts` — добавлены `broadcastStudentLesson*` вызовы. Если позже добавят e2e на tutor lesson CRUD, новые WS-броды не должны порождать flaky-сценариев.

## Dead (фича удалена, тест остался)

Нет.

## Не классифицировано

Все user-facing изменения классифицированы выше. Backend-только изменения (`backend/src/lib/websocket/studentAuth.ts`, `backend/src/services/studentEmailVerification/`, `backend/src/middleware/studentAuth.ts` и т. п.) уже покрыты backend integration-тестами (cross-role-security, services/__tests__, controllers/__tests__).

## Что сделать перед PR

1. Доделать `student-invite-registration.draft.spec.ts` (главный онбординг — критичный путь, @critical).
2. Доделать `student-login-via-toggle.draft.spec.ts` + cross-role регрессию (рискованный security flow, @critical).
3. Доделать `student-views-own-schedule.draft.spec.ts` (главное «зачем кабинет нужен», @critical).
4. Доделать `tutor-issues-student-invitation.draft.spec.ts` (точка входа в фичу со стороны учителя, @critical).
5. Остальные drafts (`@regression`) — для прицельного второго захода после критичных.

Все черновики помечены `@draft` и автоматически исключаются из обычного прогона (`--grep-invert "@draft|@visual"`).
