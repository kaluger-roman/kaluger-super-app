# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

### Infrastructure
- Prisma migration `20260509024056_tax_rate_periods` creates `tax_rate_periods` table with `(userId, startDate)` unique + index, adds `users.taxEnabled`, migrates legacy data, and drops `users.taxRate` in a single atomic step
- New script `npm run admin:hash-password -- <password>` to generate bcrypt hash for `ADMIN_PASSWORD_HASH`
- New dependency: `express-rate-limit`
- Test setup ensures `JWT_SECRET` / `ADMIN_JWT_SECRET` are present even without `.env.test`

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
