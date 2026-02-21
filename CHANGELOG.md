# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
