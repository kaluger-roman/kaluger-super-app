# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-09-04

### Fixed
- Clearing the notes, homework or description field in the lesson edit form now actually deletes the text. Previously an emptied field was silently dropped from the update request and the old value stayed in the database — the note reappeared on the card after saving. Whitespace-only values are treated as empty too.

### Added
- Lesson notes are now visible directly on the lesson card in the list — no need to open each lesson dialog to read them. A non-empty note shows as a compact 2-line snippet; if the text is truncated, a "Развернуть"/"Свернуть" control expands and collapses the full note in place (line breaks preserved) without opening the lesson view. Expand state is independent per card, the control has a touch-friendly hit area on mobile, long unbroken words/links wrap without breaking layout, and cards for lessons without a note look unchanged (no empty block). Works across all list views that use the lesson card, including the weekly list view.

## 2026-08-09

### Added
- MAX messenger is now available alongside WhatsApp and Telegram everywhere a contact method is chosen or shown — student and parent contact in the add/edit student form, the student card, and the student view dialog. Existing students are unaffected; the default for new students stays WhatsApp.
- Trial lessons without a student: the lesson form has a new "Пробный урок" toggle (with an info tooltip explaining it) that records a lesson for a prospective student by name only — no student card required. Optional phone and messenger, price defaults to 0 ₽, and the weekly-recurring option is hidden. Such lessons show in the calendar and list marked "Пробный", count toward the trial-lessons statistic while staying out of income, and can later be linked to a real student — linking clears the prospect data and preserves the lesson's original date, price and status.

### Fixed
- Opening the sidebar drawer no longer logs a React "unrecognized `$drawerWidth` prop" console error — the styled Drawer now filters transient `$`-props (found during manual QA of this feature).

### Changed
- `/code-review-local` — added 3 recall angles ported from the `/code-review` (max effort) protocol: removed-behavior auditor, cross-file tracer, and wrapper/proxy correctness (5 → 8 parallel reviewer agents). Finding JSON schema unchanged, so the `/auto-feature` code-review loop stays compatible (frontmatter model also aligned to opus to match the body)

### Fixed
- Lessons page no longer strands you on an empty page after the last item leaves the current page (e.g. marking the only unsent homework on the last page as sent, marking the last unpaid lesson as paid, or deleting the last lesson on a page). The list now falls back to the last page that still has items instead of showing an empty "nothing left" state with the pagination control hidden. Applies to all paged tabs.
- Opening the user menu, the sidebar drawer, or a dialog no longer shifts or breaks the page layout. Removed MUI's modal scroll-lock, which mutated `<body>` (overflow + scrollbar-width padding) on every popup and reflowed the content.
- Unified the loading indicator: the lazy-route loader now uses the same full-screen overlay as the global blocking spinner, so startup no longer shows two different spinners at once.

## 2026-05-31

### Changed
- Unified student terminology in the UI from "студент" to "ученик" across the add/edit student dialog (title, name field label and placeholders) and the student create/update/delete error notifications

### Fixed
- Student form: submitting with an empty name now shows a clear "Имя ученика обязательно для заполнения" toast instead of silently doing nothing — the empty-name validation no longer calls an Effector unit from inside a pure `filter` (which threw `unit call from pure function` and swallowed the feedback)

### Tests
- E2E coverage expanded by ~28 Playwright journeys across auth, students, lessons, profile/finance, admin and news. Highlights: student-cabinet flows (invite registration, role-toggle login, email verification, own schedule, realtime WS updates, settings), recurring-lesson series delete / price-change / cascade time-shift, full reschedule apply, scheduling-conflict error, unpaid-lesson cancel, student unarchive/delete, profile name edit, logout dialog, tax-period edit, admin login rejection, news pagination, and manual DB backup (38a21ad, e7eb634, 0a23ad3, 35c939f, 87878d1)
- E2E test seams added to the `/api/__test__` router: direct student-user creation with verification state, admin token issuance, backup-file reset, and `archived` support on student seeding (c34e686, 38a21ad, e7eb634)
- `/e2e-hunt` coverage report capturing 25 prioritized user-journey gaps (c34e686)

## 2026-05-24

### Added
- `/auto-feature` slash command — sequential 7-phase orchestrator driving full feature development from a single user prompt: worktree → `/speckit.specify` (✋ checkpoint) → mockup React components in final FSD locations with `TODO(auto-feature)` markers + Playwright screenshots desktop/mobile/open-modals (✋ checkpoint) → `/speckit.clarify` + `/speckit.plan` + `/speckit.tasks` → `/speckit.implement` with Effector wiring + tests + lint + tsc + `/changelog` → code-review loop (cap 5 iterations, threshold 50, convergence detector, fixes applied in main agent) → `/manual-qa --fix` → final report with the QA remainder for the user. State persisted in `.claude/auto-feature/<slug>/state.json` with full resume support. All sub-agents on `opus` with explicit max-reasoning-effort instructions; no automatic git/PR operations (536b0bb)
- `/code-review-local` slash command — local-diff variant of the official PR `code-review` plugin: 5 parallel Sonnet reviewers (CLAUDE.md compliance, shallow bug scan, deep logic with context reads, security/data leakage, type/contract safety) + parallel Haiku scorers using the same 0/25/50/75/100 rubric. Dedupes findings across agents, sorts by score, configurable `--threshold` (default 50 vs plugin's hardcoded 80), works against `git diff <base-ref>...HEAD` instead of a PR. Structured JSON output to `docs/code-reviews/<branch>/iter-N.json` plus `--silent` mode (path-only stdout) for orchestrator consumption (536b0bb)
- `docs/improvement-reports/2026-05-24-improve-hunt.md` — improve-hunt report (10 high-impact candidates, all applied in this batch) (beaa058)
- Regression coverage for every fix: `backend/src/__tests__/trustProxy.test.ts`, `runBackupJob.test.ts`, `lessonStatusUpdater.test.ts` (select-only) and extended `validateEnv.test.ts`; frontend `error.helpers.test.ts`, `keyboard.helpers.test.ts`, plus a11y / memo / toast cases in `UserAvatar`, `LessonsMonth`, `LessonCard`, `tutor-student-invitation.model` tests (beaa058)

### Changed
- `/manual-qa` slash command — added a stable JSON findings index (`*.findings.json` written next to the MD report) so orchestrators can read coverage, severity counts, per-finding category/severity/screenshot paths, and autofix status programmatically. Final stdout message extended with the JSON path. Constraint added: `findings.json` is always written (even on zero findings) as a public contract (536b0bb)
- Lesson list visual identity: indigo/purple gradients on year / month headers and the AppHeader emoji shadow (`#667eea` / `#764ba2` / `#42a5f5` / `#7e57c2`) replaced with `theme.palette.primary` / `secondary` tokens — the list now matches the app's green palette and auto-adapts to theme changes (beaa058)

### Fixed
- Двойной клик по «Создать урок» больше не создаёт дубликат урока (та же защита для админ-логина) — `$lessonApiIsLoading` теперь считается через `combine(.pending)`, плюс фильтр на `formSubmitted`/`loginSubmitted` по `!pending`
- `GET /api/push/vapid-key` отдаёт `200 {vapidPublicKey: null, configured: false}` вместо `500`, когда VAPID не сконфигурирован — фронт корректно держит `$vapidKey = null` и не пытается подписаться
- Поле «Стоимость урока» в форме создания/редактирования урока автоматически заполняется из часовой ставки выбранного ученика (включая архивных), если поле пустое
- В диалоге удаления урока теперь выводятся дата и диапазон времени урока — учителю с пересекающимися занятиями проще не перепутать
- `/admin` под уже залогиненным учителем показывает понятный экран «Только для администраторов» с email и кнопкой «Назад на главную» вместо отдельной второй формы логина; кнопка «Войти» в админ-форме дизейблится во время сабмита
- `runBackupJob` now wraps its body in `try/catch` that logs `{ name, message, stack }` structured and re-throws — pg_dump / disk / Prisma failures previously surfaced in pm2 logs as `[object Object]` with no diagnostic context (beaa058)
- `validateRequiredEnv` extended to cover `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — server now refuses to start on a half-configured deploy instead of failing on the first registration / password-reset / push subscription (beaa058)
- Tutor invitation toasts: `Приглашение создано` / `Приглашение отозвано` now fire on `issueInvitationFx.done` / `revokeInvitationFx.done`, restoring success/error symmetry on slow connections (beaa058)

### Security
- nginx-aware `express-rate-limit`: backend now sets `app.set("trust proxy", 1)` so `req.ip` reflects the real client (X-Forwarded-For) instead of `127.0.0.1`. Login / forgot-password / admin-login / student-auth rate limits are no longer shared across the whole user base (beaa058)

### Performance
- `lessonStatusUpdater` cron (runs every minute): both `findMany` calls now `select: { id: true }` — Postgres no longer streams full Lesson rows (incl. `description`, `homework`, `notes`) just to read ids (beaa058)
- Lesson list re-renders: `LessonCard` and `LessonsDay` wrapped in `React.memo`; `useLessonMenu` and `useLessonsGrouping` memoize their callbacks via `useCallback`, so a single WebSocket lesson update no longer re-renders every card in the visible month (beaa058)

### Accessibility
- `LessonsYear`, `LessonsMonth` headers are now real keyboard buttons: `role="button"`, `tabIndex={0}`, `aria-expanded`, Russian `aria-label`, and Enter/Space activation via a shared `handleActivationKey` helper (beaa058)
- Dashboard quick actions migrated from clickable `Card` to `CardActionArea` with per-card `aria-label`, so keyboard / screen-reader users can reach Уроки / Ученики / Отчёты / Новый урок (beaa058)
- `UserAvatar` in the header (the only entry point into the profile menu) exposes `role="button"`, `tabIndex={0}`, `aria-label="Меню пользователя <name>"`, `aria-haspopup="menu"` and Enter/Space activation (beaa058)

### Refactor
- `shared/lib`: removed duplicated `extractAxiosErrorMessage` / `AxiosLikeError` / `axios-error.helpers.ts` / `axios-error.types.ts`. Single canonical `extractAxiosError(err, fallback)` lives in `error.helpers.ts`, deliberately ignores axios `.message` (English `"Network Error"`) and requires a Russian fallback. 7 model files migrated (beaa058)
- New shared helpers: `handleActivationKey` for keyboard activation on non-button elements (used by LessonsYear, LessonsMonth) (beaa058)

### Internal
- `/qa-roam` skill: убран жёсткий лимит «не более 5 пунктов» в отчёте — теперь записывается всё, что прошло фильтры Этапа 3, отсортированное по приоритету
- Новый отчёт QA Roam: `docs/qa-roam-reports/2026-05-24-qa-roam.md`

## 2026-05-22

### Added
- Student personal cabinet (MVP): tutor generates a one-shot invite link from the student card, student registers via `/student-invite/<token>` (full name + email + password), gets a separate `StudentUser` account isolated from the tutor `User`, and lands in their cabinet automatically authenticated (4b0480a)
- Unified `/login` page with a "Войти как: преподаватель / ученик" toggle — tutor flow keeps the existing `/api/auth/*`, student flow uses a new `/api/student-auth/*` namespace with its own JWT, rate limits and email-verification flow; `/admin/login` remains a separate page (4b0480a)
- Student cabinet sections: read-only weekly "Расписание" (lesson cards stripped of `price`, `isPaid`, `notes`, `homework`) and "Настройки" (student data + inviting tutor info); separate components from the tutor schedule to prevent leakage of tutor-only actions (4b0480a)
- Realtime updates for student schedule via a dedicated `/ws/student?token=<studentToken>` WebSocket path with `STUDENT_JWT_SECRET` and an isolated client pool inside the shared `WebSocketManager` — student receives create/update/delete/status-change/shift events without reload (4b0480a)
- Tutor's student card now shows "Ученик зарегистрирован" indicator with the registration date once the student signs up; the "Создать ссылку-приглашение" control is hidden afterwards, and regenerating the link invalidates any previous one immediately (4b0480a)
- E2E test drafts covering invite, login toggle, schedule, realtime sync, PWA and student settings journeys (1598a2e)

### Fixed
- Recurring lesson shift now broadcasts a student schedule event for every shifted lesson in the series — previously only the base lesson updated on the student cabinet, the rest stayed stale until reload
- Student email verification attempt counter is now incremented atomically via Prisma `increment` — closes a race where parallel wrong-code requests read the same snapshot and overwrote each other, bypassing the attempts limit
- `getCurrentStudentFx` registered with the global `$isBlocking` overlay so the initial student-cabinet load shows the loading state instead of a blank screen
- Hard-reload / deep-link inside `/student/cabinet/*` no longer kicks the student to `/login` — boot-orchestration moved into `appInitModel`, so the student-only path no longer triggers `initializeAppFx` (which would 401 on tutor endpoints and force-redirect via the tutor axios interceptor)
- `InvitationManager` disables "Создать ссылку-приглашение" / "Создать новую" for archived students with an inline warning instead of relying on a 409 from the backend after a click
- `DialogTitle` in `StudentViewDialog` no longer wraps a nested `<Typography variant="h6">` inside its `<h2>` — fixes a React DOM hydration warning
- `StudentViewDialog` now uses `dividers` on its content and a thin always-visible scrollbar so users on macOS understand the content can scroll
- `InstallPrompt` banner on 375px viewports — "Установить" button no longer gets clipped; text wrapper shrinks with `min-width: 0` while the button keeps its content-width via `flex-shrink: 0`
- PR #48 review feedback addressed across the cabinet flow (2b6a699)

### Removed
- Screen broadcast feature in full: `/screen` page with token UI, `ScreenshotMonitor` sidebar entry, frontend `screenApi` (`/screen/token`, `/screen/latest`) and Effector `screen.model`, backend `/api/screen/*` routes and controllers (`uploadScreen`, `getLatestScreen`, `getScreenToken`, HMAC token helpers), WebSocket `screen_updated` event with its frontend handler, and Mac capture tooling (`scripts/screen-capture.sh`, `scripts/com.kaluger.screen-capture.plist`)

### Infrastructure
- Prisma migration `029_student_cabinet`: new `student_users` and `student_invitations` tables; new `students.studentUserId` field linking the tutor-owned student card to the new student account (4b0480a)
- New env variable `STUDENT_JWT_SECRET`, distinct from `JWT_SECRET` and `ADMIN_JWT_SECRET` (4b0480a)

## 2026-05-10

### Fixed
- Race condition in `applyPasswordReset` — two concurrent requests with the same one-time token can no longer both apply a password change; the token's `usedAt` flip and password update now run inside `prisma.$transaction` with an atomic conditional `updateMany({ where: { id, usedAt: null } })`, so the second request fails with "ссылка уже использована"
- TOCTOU in `updateLesson` — scheduling-conflict check moved inside the same `prisma.$transaction` as the lesson update (and the recurring-shift conflict pre-check now runs through the transaction client), so a concurrent insert/update can no longer slip a conflicting lesson past validation
- Race condition in `processRecurringLessons` cron — added a module-level overlap guard (same pattern as `backupRunning`) and wrapped the conflict-check + `createMany` of every group inside `prisma.$transaction`, preventing duplicate weekly slots when the nightly tick overlaps with a manual trigger or process restart
- TOCTOU in `scheduleRemindersForLesson` — replaced the read-then-write idempotency guard with a partial unique index `(lessonId, intervalMinutes) WHERE status='PENDING'` plus per-row `create` with `P2002`-skip; concurrent calls (e.g. fast double-submit on lesson edit) can no longer deliver duplicate push notifications
- Silent loss in `processScheduledReminders` — added intermediate `PROCESSING` status and `claimedAt` field with a watchdog that reverts stale claims (>10 min) back to `PENDING`; if the Node process is killed between the claim transaction and the delivery loop, reminders are now recovered on the next tick instead of staying permanently in `SENT` without delivery
- Stale-response race in `lesson-cancellation` model on the frontend — `getCancellationInfoFx.done` samples now filter by matching the response `params` against the current `$cancellingLesson.id`; clicking «Отменить» on lesson A then quickly on B no longer reopens the confirm dialog with A's transfer info while $cancellingLesson is B
- Money/tax precision — `Lesson.price`, `Student.hourlyRate`, `TaxRatePeriod.rate` migrated from `Float` to `Decimal(10,2)` / `Decimal(5,2)`; `Prisma.Decimal.prototype.toJSON` overridden in `lib/prisma.ts` so `res.json` continues to emit `number`, preserving the API contract for the frontend
- Brute-force exposure on password-reset token — `passwordResetRateLimiter` (5 req / 15 min) is now also applied to `POST /api/auth/reset-password/verify` and `POST /api/auth/reset-password` (previously only `/forgot-password` was rate-limited)
- `backend/jest.config.js` typo `setupFilesAfterEach` → `setupFilesAfterEnv` — `setup.ts` was previously silently ignored by jest

### Changed
- Custom `Error` subclasses moved to `backend/src/utils/errors.ts` (`SchedulingConflictError`, `RecurringShiftConflictError`); local declarations inside controllers removed. `docs/conventions/backend.md` documents the rule.

### Performance
- **Backend tests 38s → 14–18s (-53..-62%)**: switched `ts-jest` preset to `@swc/jest` with `@swc-contrib/mut-cjs-exports@14.x` WASM plugin for `jest.spyOn` compatibility on CommonJS named exports; older `swc_mut_cjs_exports@10.7` is incompatible with `@swc/core@1.15`
- **Frontend setup time -31% (42s → 29s)**: removed unused MSW from `frontend/src/__tests__/setup.ts` (no test calls `server.use`; all API tests already use `vi.mock("@shared/api/base")`); added `deps.optimizer.web.include` for MUI / router / effector / date-fns to pre-bundle heavy modules (~-25% wall locally)
- **CI**: backend now matrix-sharded `[1,2]`, type-check moved to its own job, vitest blob reporter + merge-reports job, cache for `node_modules/.vite` and `@prisma/client`, `--maxWorkers=2` for 2-vCPU runners
- Frontend route-level code-splitting via `React.lazy` + `Suspense` for AdminPage, ReportsPage, ProfilePage, NewsPage, ScreenPage, Forgot/ResetPasswordPage, DashboardPage, LessonsPage, StudentsPage — initial bundle for `/login` no longer includes lesson/admin/reports code

### Added
- `docs/research/2026-05-10-test-speedup.md` — research report covering Phase 1+2 optimizations (this PR) and Phase 3 backlog (`@quramy/jest-prisma` transactions, vitest `--no-isolate` for Effector stores)
- `docs/improvement-reports/2026-05-10-improve-hunt.md` — improve-hunt report (10 candidates)

### Infrastructure
- Prisma migration `20260510173034_add_token_version_and_indexes` — adds `User.tokenVersion` column + `students.tutorId_archived` index (#2 + #4 from improve-hunt)
- Prisma migration `20260510182545_partial_unique_pending_reminders` — cleans up any existing duplicate PENDING reminders and creates the partial unique index used by the new scheduler idempotency contract
- Prisma migration `20260510182600_add_processing_reminder_status` + `20260510182700_add_reminder_claimed_at` — add `PROCESSING` enum value and nullable `claimedAt` column to `scheduled_reminders` for the crash-safe claim/finalize flow
- Prisma migration `20260510182800_money_to_decimal` — `ALTER COLUMN ... TYPE DECIMAL` for `lessons.price`, `students.hourlyRate`, `tax_rate_periods.rate`
- New bug-hunt report `docs/bug-reports/2026-05-10-bug-hunt.md` (10 candidates, 8 fixed in this batch; #1 and #4 deferred as a temporary feature, screen monitoring)

### Security
- JWT revocation on password/email change — added `User.tokenVersion` field, included in JWT payload by `login` and `verifyEmailChange`, verified by `authenticateToken` middleware against DB; `changePassword`, `verifyEmailChange`, and `applyPasswordReset` now increment `tokenVersion` to invalidate all previously issued tokens. A stolen JWT can no longer survive a password reset (improve-hunt #2)
- Rate limiting on sensitive auth/upload endpoints — `authRateLimiter` applied to `POST /api/auth/change-password` and `/change-email`; new `screenUploadRateLimiter` (60 req / min) on `POST /api/screen/upload` (improve-hunt #3)

### Refactor
- Removed `<form>` tags from `LoginForm`, `RegisterForm`, `LessonForm`, `StudentForm` per `docs/conventions/frontend.md`; submit via explicit `onClick` + `onKeyDown` Enter handler. `formSubmitted` Effector events changed to `createEvent()` without `FormEvent` payload
- Backend route files (`lessons.ts`, `students.ts`, `statistics.ts`, `news.ts`, `__test__.ts`) converted from `export default router` to `export const xxxRouter` for consistency with `auth.ts`, `push.ts`, etc.

### Added
- `/e2e-check` slash command — analyzes diff vs base ref, classifies user-facing changes as uncovered / possibly-affected / dead vs existing Playwright tests, optionally writes `*.draft.spec.ts` skeletons and a per-branch report under `docs/e2e-coverage/checks/` (4a045aa)
- `/e2e-hunt` slash command — runs parallel `feature-dev:code-explorer` subagents per app area (auth, students, lessons, profile, reports, admin, dashboard/news, pwa) to inventory user journeys, dedupes against existing tests, and produces a prioritized coverage gap report under `docs/e2e-coverage/` (4a045aa)
- `docs/conventions/e2e-testing.md` — full e2e conventions: when e2e is justified, two modes (functional vs `@visual`), required tag scheme (`@critical`/`@regression`/`@visual`/`@draft` + area tags), selector priority, page-object policy and tests-as-source-of-truth model for coverage tracking (4a045aa)
- `frontend/e2e/README.md` — quick-reference cheatsheet for the e2e folder (folder layout per area, run commands with `--grep` filters, selector rules, two-mode example) (4a045aa)

### Changed
- `docs/conventions/frontend-testing.md` — replaced the legacy "E2E — screenshot comparisons only, no other assertions" rule with a pointer to the new `e2e-testing.md` covering both functional user-journey and visual modes (4a045aa)
- `CLAUDE.md` — added `e2e-testing.md` to the mandatory pre-coding reading list and registered `/e2e-check` and `/e2e-hunt` in the Slash Commands section (4a045aa)



### Added
- Password recovery via email link: public `/forgot-password` page collects an email and dispatches a one-time SHA-256-hashed token (15-min TTL, single-use, cascade-on-user-delete); `/reset-password?token=...` validates the token on mount and lets the user set a new password (a7d3d54)
- Three new public auth endpoints: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/verify`, `POST /api/auth/reset-password` (a7d3d54)
- "Забыли пароль?" link added to the login form (in addition to the existing entry point inside the change-password dialog) (a7d3d54)
- Anti-abuse hardening: per-IP rate limiter (5 req / 15 min) on `/forgot-password`, 60-second per-email cooldown, automatic invalidation of older unused tokens on each new request, uniform anti-enumeration success response, automatic `isEmailVerified = true` on successful reset (a7d3d54)
- `sendPasswordResetEmail` template using the existing Resend infrastructure (a7d3d54)

### Changed
- `ResetPasswordForm` cancel button on the invalid-token state shortened from "Вернуться ко входу" to "Отмена" (743403a)

### Fixed
- New password-recovery effects (`forgotPasswordFx`, `verifyResetTokenFx`, `resetPasswordFx`) registered with the global `$isBlocking` overlay; per-component spinners removed to match the project's loading-UX convention (df5c2ca)
- `ResetPasswordForm` no longer re-fires `verifyResetTokenFx` on every keystroke: replaced `useEffect` with an Effector Gate that accepts the token as a prop. `ForgotPasswordFormGate.close → formReset` also clears stale success/error state on navigation (df5c2ca)

### Infrastructure
- Prisma migration `20260509190733_add_password_reset_tokens` adds the `password_reset_tokens` table with hashed-token unique index and `ON DELETE CASCADE` FK (a7d3d54)
- New env variable `FRONTEND_URL` documented in `backend/.env.example` — used to build the reset URL placed into outgoing email (a7d3d54)
- New `passwordResetRateLimiter` (5 req / 15 min, skipped in test env) wired in `middleware/rateLimit.ts` (a7d3d54)

## 2026-05-09

### Added
- Tax rate now lives as a chronological chain of periods (`TaxRatePeriod`) with start date + percent; tax amount on the reports page is computed per-payment using the rate active on each lesson's `paymentDate`
- New profile toggle "Учитывать налог" — disabled by default for all users; when off, no tax UI/calculation anywhere in the app
- Modal dialog "Налоговые ставки" for managing the period list (add/edit/delete) — atomic save/cancel, blocks deleting the last period while toggle is on
- Tax card on reports page now shows an info-icon with hover/click tooltip listing applicable rates and amounts (`X% × Y ₽ = Z ₽`), including a "вне настроенных периодов" row for payments before the earliest period (rate 0%)
- Backend REST endpoints `GET/POST/PATCH/DELETE /api/tax-periods` for CRUD over periods (validation: rate 0–100, unique `startDate` per user, Russian error messages)
- Backend `GET /api/statistics` now returns `taxAmount: number | null` and `taxBreakdown: TaxBreakdownEntry[] | null` (both null when toggle is off)

### Changed
- `User.taxRate` removed from schema and replaced by `User.taxEnabled` + relation to `TaxRatePeriod[]`; existing users with non-default tax rate (`!= 6.0`) get migrated to a single seed period spanning their full history with the toggle pre-enabled, others reset to off
- Tax card label adapts: single applicable rate → `Налоги (X%)`; multiple rates → neutral `Налоги` + info-icon
- Tax assignment per lesson is now driven by `paymentDate` (when the income was received) instead of `startTime`, matching how Russian tax law recognizes income on receipt

### Fixed
- Admin login compares password via bcrypt hash from `ADMIN_PASSWORD_HASH` instead of plain string equality with `ADMIN_PASSWORD` — eliminates plain-text storage and timing attack
- WebSocket reconnect for the same user no longer drops the new connection when the old socket's stale close handler fires later (live status updates are no longer silently lost after a reconnect)
- `JWT_SECRET` and `ADMIN_JWT_SECRET` are now mandatory — server throws at startup if either is missing, hardcoded fallback values removed from sources
- Auth endpoints (`/login`, `/register`, `/verify-email`, `/resend-verification`, `/admin/login`) now have rate limiting via `express-rate-limit` (skipped in test env)
- Email is normalized to lowercase on register, login, verify, resend-verification, and email-change flows — case-insensitive uniqueness, no more duplicate accounts
- `PUT /api/lessons/:id` payment transfer when cancelling a paid lesson runs inside `prisma.$transaction` (atomic — no double-paid state on partial failure)
- `lessonStatusUpdater` cron uses `updateMany` with status filter — manually cancelled lessons are no longer overwritten back to IN_PROGRESS/COMPLETED on the next tick
- `GET /api/lessons?page=abc` no longer collapses pagination to "return everything" — invalid page/limit fall back to defaults and limit is clamped to 100
- Lesson cancellation dialog cleanup checks lesson id — WebSocket-driven CANCELLED updates for unrelated lessons no longer wipe the active dialog state
- `LessonCell`, `StudentInfo`, `StudentCard`, `StudentSelector` no longer render an orphan `0` when price/hourlyRate equals 0
- Recurring lesson creation: scheduling-conflict check and `createMany` now run inside `prisma.$transaction` — double-clicks and HTTP retries no longer create duplicate lesson series
- Single-lesson creation: scheduling-conflict check and `create` also wrapped in `$transaction` for the same reason
- `GET/PUT /api/reminder-settings`: replaced `findUnique + create` with `upsert` — parallel first requests (multiple tabs on first sign-in) no longer surface a 500 from a P2002 unique-constraint race
- Lesson `price: 0` (free trial) is now preserved instead of being silently overwritten with `student.hourlyRate` (the `||` fallback treated 0 as falsy and inflated free lessons to full rate)
- WebSocketManager registers `close`/`error`/`message` handlers before sending the welcome message — if `ws.send` throws synchronously (socket closed during handshake) the entry no longer leaks in the connected-clients map
- All cron jobs (recurring lessons, lesson status updates, reminder processing, daily backup) now run with explicit `timezone: "Europe/Moscow"` instead of relying on the server's system clock — "daily at 2 AM" actually fires at 02:00 MSK
- Push reminders desync: server-side `enabled=false` is now written only on a successful browser unsubscribe (`unsubscribePushFx.done` instead of `.finally`); failures show a Russian error toast and leave the server state unchanged
- Weekly lessons view: day-grouping key now includes the year — lessons from different years that share the same day/month no longer collapse into one section
- Login/register navigation: redirect to `/` is now triggered only by a successful `loginFx`/`registerFx` for an already-verified user, not by every change to `userModel.$isAuthenticated` — email verification on `/verify-email` no longer side-effects a redirect through the login form model, and the home navigation no longer fires twice from two independent samples
- Reminder processor caps each tick at 100 pending reminders (oldest first) — recovering after server downtime no longer claims the entire backlog inside one transaction or floods the push provider in a single minute

### Infrastructure
- Prisma migration `20260509024056_tax_rate_periods` creates `tax_rate_periods` table with `(userId, startDate)` unique + index, adds `users.taxEnabled`, migrates legacy data, and drops `users.taxRate` in a single atomic step
- New script `npm run admin:hash-password -- <password>` to generate bcrypt hash for `ADMIN_PASSWORD_HASH`
- New dependency: `express-rate-limit`
- Test setup ensures `JWT_SECRET` / `ADMIN_JWT_SECRET` are present even without `.env.test`
- Test setup also defaults `RESEND_API_KEY` so suites that import the email service can run without a real key

## 2026-04-07

### Added
- Change password on profile page: verify current password, validate new password, update hash (664d6b6)
- Change email with two-step verification: enter new email + password, confirm with 6-digit code sent to new address (664d6b6)
- New JWT token issued after email change to reflect updated email in payload (664d6b6)
- 4 new API endpoints: `POST /api/auth/change-password`, `POST /api/auth/change-email`, `POST /api/auth/verify-email-change`, `POST /api/auth/resend-email-change-code` (664d6b6)
- Resend verification code with 60-second cooldown timer on frontend (664d6b6)

### Infrastructure
- Prisma migration adding `pendingEmail` field to users table (664d6b6)
- 54 new tests: 35 backend (service + controller integration) and 19 frontend (Effector model) (664d6b6)

## 2026-04-06

### Added
- Reports page: new "Поступления за период" card showing total sum and count of payments received within the selected date filter (aggregated by `paymentDate`, independent of lesson `startTime`)
- Backend `GET /api/statistics` now returns `paymentsInRangeSum` and `paymentsInRangeCount`
- Lessons page: new "Все" tab appears when payment date filter is active, showing lessons of all statuses at once. Filter auto-switches to this tab on activation and reverts to "Запланированные" on clear
- Lessons page: payments summary bar above the list ("Оплачено за период: {сумма}, {N} уроков") when payment date filter is active, aggregated across all pages via new `paymentsSummary` field on `GET /api/lessons`

## 2026-03-30

### Added
- Payment date filter on lessons page — filter by date range with presets: current month, last month, current week (2559796)
- Payment date range filter in backend `getLessons` controller with validation (2559796)
- Timezone-aware statistics: all date range queries use user's timezone from `X-Timezone` header for correct month/day boundaries (2559796)

### Changed
- Statistics endpoints (`getStatistics`, `getLessonStats`, `getStudentStats`) now accept and use `X-Timezone` header for default date ranges (3da5fc1)
- Weekly lesson view sends `weekStart` as ISO string preserving user's local midnight (3da5fc1)

## 2026-03-16

### Added
- PWA support: app installable as standalone with proper manifest, iOS meta-tags, and service worker for push events and offline caching (1cfdb6a)
- Push notification reminders before lessons with configurable intervals (5, 10, 15, 30, 60 min) (1cfdb6a)
- "Do not disturb during lesson" setting — suppresses reminders when another lesson is in progress (1cfdb6a)
- Reminder settings UI in profile page with toggle, interval chips, and mute option (1cfdb6a)
- Push subscription management: subscribe, unsubscribe, list devices (1cfdb6a)
- Offline indicator snackbar when network connection is lost (1cfdb6a)
- Backend cron job to process scheduled reminders every minute with atomic claim to prevent duplicates (1cfdb6a)
- Automatic reminder scheduling/cancellation when lessons are created, updated, or rescheduled (1cfdb6a)

### Fixed
- Security: push subscription endpoint ownership check to prevent subscription takeover (c29f1b9)
- App stuck on loading spinner when initialization fails — now sets `$appInitialized = true` on error (c29f1b9)
- Push subscription not revoked when user disables reminders (c29f1b9)
- Failed push delivery now marks reminder as `FAILED` instead of retrying indefinitely (c29f1b9)
- Reminders for shifted recurring lessons now recalculated after time change (59a49a2)
- Recurring lesson reminder query scoped to exact created startTimes to avoid duplicates (59a49a2)
- Old push subscription cleaned up from backend database when re-subscribing (59a49a2)
- Reminder cancel+recreate wrapped in `prisma.$transaction` to prevent race conditions (59a49a2)
- Flaky `createLesson` test — increased conflict weeks from 13 to 14 to cover 3-month boundary (7c3b1d5)

### Infrastructure
- Added `PushSubscription`, `ReminderSettings`, and `ScheduledReminder` Prisma models with migrations (1cfdb6a)
- Added `web-push` npm dependency for VAPID-based push notifications (1cfdb6a)
- Added `FAILED` status to `ReminderStatus` enum (c29f1b9)
- Removed `backend/dist/` from git tracking (abe86e9)

## 2026-02-24

### Added
- Tutor landing page at `teacher.kaluger.ru` — single-page static site built with Next.js and Tailwind CSS v4
- Hero section with tutor name, tagline, about text, experience badge, and CTA button
- Education section with timeline-style layout showing degrees and institutions
- Certificates section with responsive grid cards and image support
- Lesson conditions section with subject cards displaying levels, duration, and pricing
- Reviews section with star ratings, text truncation with "read more", and "show more" pagination
- Contacts section with social links: Профи.ру, VK, WhatsApp, Telegram, Max (custom SVG icons for Профи.ру and Max)
- Sticky header with responsive navigation and mobile hamburger menu
- Scroll-triggered fade-in animations via custom `useInView` hook (Intersection Observer API)
- Full SEO metadata: Open Graph, canonical URL, robots, sitemap.xml
- Static export to `out/` directory for Nginx serving
- Comprehensive test suite: 66 tests covering all components, hooks, and icons

### Infrastructure
- Added `landing/` project to CI pipeline (lint, type check, tests, build)
- Added landing build and deploy steps to deploy workflow (rsync `out/` to VPS)
- Created Nginx server block config for `teacher.kaluger.ru` with SSL, caching, and gzip

## 2026-02-22

### Added
- News section with paginated list, styled cards, and empty state (3ae41dd)
- Unread news badge indicator in sidebar with dot badge on the news icon (3ae41dd)
- Backend API endpoints for news: `GET /api/news`, `GET /api/news/has-unread`, `POST /api/news/mark-read` (3ae41dd)
- `/news` slash command to generate user-friendly Russian news entries from CHANGELOG.md (3ae41dd)
- Auto-sync of news entries to production database during deployment via JSON seed files (3ae41dd)

### Infrastructure
- Added `NewsItem` and `NewsReadStatus` Prisma models with migration (3ae41dd)
- Added `node dist/scripts/syncNews.js` step to deploy pipeline (3ae41dd)

## 2026-02-21

### Added
- Configurable tax rate in user profile with validation (0–100%, default 6%) (5ec8609)
- Tax amount card on financial statistics dashboard showing calculated tax for the selected period (5ec8609)
- Server-side tax calculation in statistics endpoint: `taxAmount = Math.round(earnings * taxRate / 100)` (5ec8609)
- Prisma migration adding `taxRate` field to users table (5ec8609)
- `UpdateProfileDto` type for partial profile updates (5ec8609)
- Unit tests for tax rate validation, tax amount calculation, and UI components (5ec8609)

### Fixed
- Profile page save button incorrectly enabled when no changes were made due to missing `taxRate` in test mock (5609dd2)
