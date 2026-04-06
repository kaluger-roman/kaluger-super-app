# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
