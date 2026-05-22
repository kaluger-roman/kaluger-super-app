# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-05-22

### Removed
- Screen broadcast feature in full: `/screen` page with token UI, `ScreenshotMonitor` sidebar entry, frontend `screenApi` (`/screen/token`, `/screen/latest`) and Effector `screen.model`, backend `/api/screen/*` routes and controllers (`uploadScreen`, `getLatestScreen`, `getScreenToken`, HMAC token helpers), WebSocket `screen_updated` event with its frontend handler, and Mac capture tooling (`scripts/screen-capture.sh`, `scripts/com.kaluger.screen-capture.plist`)

## 2026-05-10

### Performance
- **Backend tests 38s → 14–18s (-53..-62%)**: switched `ts-jest` preset to `@swc/jest` with `@swc-contrib/mut-cjs-exports@14.x` WASM plugin for `jest.spyOn` compatibility on CommonJS named exports; older `swc_mut_cjs_exports@10.7` is incompatible with `@swc/core@1.15`
- **Frontend setup time -31% (42s → 29s)**: removed unused MSW from `frontend/src/__tests__/setup.ts` (no test calls `server.use`; all API tests already use `vi.mock("@shared/api/base")`); added `deps.optimizer.web.include` for MUI / router / effector / date-fns to pre-bundle heavy modules (~-25% wall locally)
- **CI**: backend now matrix-sharded `[1,2]`, type-check moved to its own job, vitest blob reporter + merge-reports job, cache for `node_modules/.vite` and `@prisma/client`, `--maxWorkers=2` for 2-vCPU runners

### Fixed
- `backend/jest.config.js` typo `setupFilesAfterEach` → `setupFilesAfterEnv` — `setup.ts` was previously silently ignored by jest

### Added
- `docs/research/2026-05-10-test-speedup.md` — research report covering Phase 1+2 optimizations (this PR) and Phase 3 backlog (`@quramy/jest-prisma` transactions, vitest `--no-isolate` for Effector stores)

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
