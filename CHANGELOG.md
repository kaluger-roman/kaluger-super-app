# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
