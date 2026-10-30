# Implementation Plan: Алерты в админке и их дублирование на почту

**Branch**: `037-admin-alerts` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-admin-alerts/spec.md`

## Summary

The backend gets a generic alert mechanism: an `admin_alerts` table (one
active row per type, enforced by a unique nullable `activeType`), a code
registry of alert definitions (`type`, `severity`, `title`, optional
`check`), a runner that applies check results (open / refresh / resolve),
cleans up alerts resolved more than 90 days ago and dispatches letters with
up to 5 attempts each, plus a singleton `admin_settings` row with the alert
address and switch. The first source is backups: 11 definitions in
`services/backupAlerts` read `BackupSettings` (new `enabledChangedAt`),
the backup files, the prod disk (`fs.promises.statfs`) and the offsite
dot-files, including a new `.offsite-storage.json` that the home pull script
sends through a new strictly validated `report-storage` command of the prod
SSH wrapper. Checks run every 15 minutes by cron and right after every
backup attempt (`backup_failed` raise/resolve). Letters go through Resend
(`sendAdminEmail`, which, unlike the existing helpers, checks Resend's
`error` result). The admin UI mockups (tabs «Алерты» and «Настройки», tab
counter, Overview banner) are wired to new Effector models in
`features/admin`, the mocks are deleted, and the offsite thresholds (24 h /
48 h) now come from the backend response.

## Technical Context

**Language/Version**: TypeScript 5.x strict (backend Node 20, frontend React 19); bash (home/prod offsite scripts)
**Primary Dependencies**: Express, Prisma 6, node-cron, Resend SDK 6 (backend); React, Effector, effector-react, patronum, MUI (frontend). No new npm dependencies (`fs.promises.statfs` is in Node 20)
**Storage**: PostgreSQL via Prisma — new tables `admin_alerts`, `admin_settings`, enums `AdminAlertSeverity`, `AdminAlertEmailStatus`, new column `backup_settings."enabledChangedAt"` (backfilled from `updatedAt`); new prod file `$BACKUP_DIR/.offsite-storage.json`, new home file `~/prod-backups/.cap-pruned`
**Testing**: backend Jest + Supertest on the real test DB (tmp `BACKUP_DIR`, `jest.mock` of the email module and of `backupAlerts/diskSpace`, global test lock `ADMIN_ALERTS`); frontend Vitest + RTL + MSW (`fork` for models); scripts `node --test scripts/__tests__/` with stubbed `ssh`/`rrsync`/`df`; one Playwright spec for the admin alerts journey
**Target Platform**: prod Ubuntu 24.04 (pm2, single fork), home Ubuntu 22.04 (user crontab); admin UI desktop + mobile 375 px
**Project Type**: web (frontend + backend) + ops scripts
**Performance Goals**: letter about a failed backup ≤ 5 min after the attempt (sent in the same request/tick, SC-001); other problems ≤ 20 min (15-min cron + first send attempt, SC-002); one check run is a handful of small queries and file reads
**Constraints**: admin is not a `User` (no WebSocket, data refresh on open / tab change / actions); one recipient; Resend failures must not lose the alert; prod gives home no new access (strict wrapper command only); FR-007: new alert types without schema / API / frontend changes
**Scale/Scope**: 11 alert types, a few alert rows per month; 6 new endpoints; ~4 new frontend models/helpers files; 2 scripts + wrapper changed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. FSD (frontend) | PASS | Models in `features/admin/models`, API + types in `shared/api`, `pluralize` and `formatDateTime(…, timeZone)` in `shared/lib`; pages only compose; no upward imports |
| II. Layered MVC | PASS | Controllers `controllers/adminAlerts`, `controllers/adminSettings` only validate/format; logic in `services/adminAlerts`, `services/backupAlerts`, `services/alertRegistry`; cron wiring in `index.ts` |
| III. Effector | PASS | `sample` only, `useUnit`, gates (`AdminPageGate`), form state (`$alertEmail`, `$alertEmailEnabled`) in stores, filter in `$alertsFilter` (replaces mockup `useState`), namespace exports, model/helpers/types split, effects in `$isBlocking` |
| IV. Type safety | PASS | `type` only; DTOs in `backend/src/types/adminAlerts.ts` (barrel `types/index.ts`), Prisma types for rows; JSON dot-files parsed from `unknown`; request bodies validated from `unknown` |
| V. Consistency | PASS | Custom errors in `utils/errors.ts`; services in sub-folders with `.constants/.helpers/.types`; controllers < 150 lines; no inline styles; Russian texts; mocks and all 15 `TODO(auto-feature)` removed; duplicated `pluralize` consolidated |
| VI. Testing | PASS | Every check open/close (SC-004), lifecycle, email state machine, API, settings, rate limit, models, helpers, components, wrapper and pull script paths, one e2e journey |
| VII. Simplicity | PASS (see Complexity Tracking) | Email state as columns on the alert (no outbox table); no partial index raw SQL; no WebSocket; in-service rate limit instead of a new limiter |

Post-design re-check (after Phase 1): PASS, no new violations. Two
deliberate notes: three service folders instead of one (to keep imports
acyclic, research R2) and the sticky `capPruned` flag at home (research R10).

## Project Structure

### Documentation (this feature)

```text
specs/037-admin-alerts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-api.md
│   ├── alert-types-and-emails.md
│   └── offsite-storage-report.md
└── tasks.md            # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                         # + AdminAlert, AdminSettings, 2 enums, BackupSettings.enabledChangedAt
│   └── migrations/<ts>_037_admin_alerts/migration.sql   # + backfill UPDATE
└── src/
    ├── index.ts                              # cron */15 runScheduledAlertChecks; backup cron → runBackupJobWithAlerts
    ├── routes/
    │   ├── admin.ts                          # + /alerts, /alerts/:id/read, /alerts/read-all, /settings, /settings/test-email
    │   └── testSupport.ts                    # + POST /admin/run-alert-checks, DELETE /admin/alerts
    ├── controllers/
    │   ├── adminAlerts/                      # getAlerts.ts, markAlertRead.ts, markAllAlertsRead.ts, index.ts
    │   ├── adminSettings/                    # getAdminSettings.ts, updateAdminSettings.ts, sendTestEmail.ts, validators.ts, index.ts
    │   └── backup/createBackup.ts            # → createManualBackupWithAlerts
    ├── services/
    │   ├── adminAlerts/
    │   │   ├── index.ts
    │   │   ├── adminAlerts.constants.ts      # ADMIN_SETTINGS_ID, MAX_EMAIL_ATTEMPTS, ALERT_RETENTION_DAYS, lengths, TEST_EMAIL_INTERVAL_MS, ALERT_EMAIL_TIME_ZONE
    │   │   ├── adminAlerts.types.ts          # AdminAlertDefinition, AlertCheckResult, AlertCheckContext, EmailKind
    │   │   ├── adminAlerts.helpers.ts        # pure: truncate, toAlertDto, sortAlerts, initial/resolve email status, next occurrences, email builders, escapeHtml, formatMoscowDateTime
    │   │   ├── alertLifecycle.ts             # raiseAlert, resolveAlert, applyCheckResult, listAlerts, markAlertRead, markAllAlertsRead, deleteExpiredAlerts
    │   │   ├── alertEmails.ts                # dispatchAlertEmails (claim → send → sent/failed/skipped)
    │   │   ├── adminSettings.ts              # getAdminSettings, updateAdminSettings, sendTestEmail (+ __resetTestEmailRateLimitForTests)
    │   │   └── runAlertChecks.ts             # runAlertChecks(definitions, now): per-check try/catch, cleanup, dispatch
    │   ├── backupAlerts/
    │   │   ├── index.ts
    │   │   ├── backupAlerts.constants.ts     # type codes, thresholds
    │   │   ├── backupAlerts.helpers.ts       # pure: evaluateDiskSpace (hysteresis), median, evaluateSizeDrop, formatGigabytes, descriptions
    │   │   ├── definitions.ts                # 11 AdminAlertDefinition + BACKUP_ALERT_DEFINITIONS, PROD_BACKUP_DEFINITIONS
    │   │   ├── diskSpace.ts                  # getDiskSpace(dir) via fs.promises.statfs
    │   │   └── backupAttempts.ts             # runBackupJobWithAlerts, createManualBackupWithAlerts
    │   ├── alertRegistry/
    │   │   ├── index.ts
    │   │   └── alertRegistry.ts              # ALERT_DEFINITIONS, runScheduledAlertChecks
    │   ├── backup/
    │   │   ├── backup.ts                     # runBackupJob returns an outcome; updateBackupSettings sets enabledChangedAt
    │   │   ├── backup.constants.ts           # + OFFSITE_STALE_HOURS, RESTORE_CHECK_STALE_HOURS, OFFSITE_STORAGE_FILE
    │   │   ├── backup.helpers.ts             # + parseOffsiteStorage, export getBackupTime
    │   │   ├── backup.types.ts               # + BackupJobOutcome, OffsiteStorageReport
    │   │   └── offsiteStatus.ts              # + thresholds in status, readOffsiteStorage
    │   ├── email.ts                          # + sendAdminEmail (checks Resend `error`)
    │   └── index.ts                          # + exports
    ├── lib/testMailbox.ts                    # + optional html
    ├── types/adminAlerts.ts, types/backup.ts, types/index.ts
    ├── utils/errors.ts                       # + AdminAlertNotFoundError, AlertEmailNotConfiguredError, TestEmailRateLimitError, AdminEmailSendError
    └── __tests__/
        ├── setup.ts                          # + __resetTestEmailRateLimitForTests
        └── helpers/globalTestLock.ts         # + ADMIN_ALERTS

frontend/src/
├── shared/
│   ├── api/admin.ts, admin.types.ts, index.ts       # + alerts/settings methods, AdminAlertsResponse, TestEmailResponse, offsite thresholds
│   └── lib/plural.helpers.ts, dateFormat.helpers.ts, index.ts   # pluralize; formatDateTime(date, timeZone?)
├── features/admin/
│   ├── index.ts                                     # + adminAlertsModel, adminSettingsModel, type AlertsFilter
│   └── models/
│       ├── adminAlerts.model.ts / .helpers.ts / .types.ts
│       ├── adminSettings.model.ts / .helpers.ts / .constants.ts
│       ├── backupStatus.model.ts                    # + $offsiteSyncStaleHours, $restoreCheckStaleHours
│       ├── index.ts
│       └── __tests__/
├── app/model/blocking.model.ts                      # + new effects
└── pages/
    ├── AdminPage/
    │   ├── AdminPage.constants.ts                   # + ADMIN_TIME_ZONE
    │   ├── mocks/                                   # DELETE
    │   └── components/
    │       ├── AlertsSection/ (AlertsSection.helpers.ts, AlertsSection.types.ts DELETE; AlertCard, AlertEmailStatus, AlertsList, AlertsEmptyState)
    │       ├── AlertsTabLabel/, SettingsSection/, OverviewSection/components/ActiveAlertsBanner/
    │       └── BackupSection/components/OffsiteStorageStatus/   # thresholds from store, local pluralize removed
    └── ReportsPage/components/IncomeHistory/IncomeHistory.helpers.ts   # shared pluralize

frontend/e2e/admin/admin-alerts.spec.ts               # new journey
frontend/e2e/helpers/auth.ts (or helpers/admin.ts)    # runAlertChecks, clearAdminAlerts helpers

scripts/offsite-backup/prod-ssh-wrapper.sh            # + report-storage
scripts/offsite-backup/pull-backups.sh                # + storage report, .cap-pruned
scripts/__tests__/offsite-backup-fixtures.mjs, offsite-backup-wrapper.test.mjs, offsite-backup-pull.test.mjs
docs/ops/offsite-backups.md                           # FR-015
docs/conventions/backend.md                           # "Alerts" pattern: how to add an alert type
```

**Structure Decision**: web app layout already in the repo (`backend/`,
`frontend/`, `scripts/`). Backend follows Routes → Controllers → Services
with three new service folders (generic core, backup source, registry);
frontend adds two models to the existing `features/admin` slice and wires the
approved mockup components in `pages/AdminPage`.

## Key Design Decisions

Details and alternatives in [research.md](./research.md).

1. **Uniqueness** — `activeType` unique nullable column (R1).
2. **Registry / generic core** — definitions with optional `check`, event-only
   types use `raiseAlert`/`resolveAlert`; three folders to avoid an import
   cycle (R2). The backend convention doc gets a short "Adding an alert type"
   section (memory: new rules go to `docs/conventions`).
3. **Occurrences** — `eventKey` decides increments; `lastSeenAt` on every
   confirmation; `readAt` sticky (R3).
4. **Letters** — per-alert open/resolve columns, status chosen at open,
   resolve mirrors a skipped open, claim-based attempts (≤ 5), resolve after
   open, settings re-read before each attempt (R4).
5. **Resend** — new `sendAdminEmail` checks `error` (R5); existing helpers'
   gap filed as issue #151.
6. **Settings** — singleton row, explicit `null` clear, in-service 1/min test
   email limit (R7).
7. **Backup checks** — table in R8; `enabledChangedAt` for disabled/overdue;
   prod disk via `statfs`; hysteresis helper shared by both disk checks.
8. **Thresholds in one place** — backend constants, sent in
   `offsite.syncStaleHours` / `offsite.restoreCheckStaleHours` (R9).
9. **Home report** — `report-storage` with 5 strict fields; sticky
   `capPruned` to avoid 6-hourly flapping (R10).
10. **Scheduling** — `*/15` cron; immediate path after each backup attempt;
    no startup run (R11).
11. **Frontend** — two models, client-side filter, refresh on gate / login /
    tab change / backup actions, Moscow time on cards, shared `pluralize`
    (R13).

## Verification

- While iterating: `npm run check` (repo root; tsc, ESLint, Prettier and
  related tests of the touched parts in parallel).
- Backend tests on the branch: `bash scripts/dev-stack.sh test-backend
  [--testPathPatterns=<path>]`.
- Frontend single file: `cd frontend && npm run test -- <path>`.
- Scripts: `node --test scripts/__tests__/`.
- E2E: `bash scripts/dev-stack.sh e2e admin/admin-alerts.spec.ts` (backend via
  `run-backend-e2e`).
- Once before the commit: `npm run check -- --full`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Three service folders (`adminAlerts`, `backupAlerts`, `alertRegistry`) for one feature | Generic core must not depend on backups (FR-007), and the backup source needs both the core and `services/backup`; a registry inside the core would import the source and close a cycle | One folder: either a runtime import cycle or backup knowledge inside the generic core |
| Sticky `.cap-pruned` state file at home | `offsite_cap_reached` must not open/close every 6 h at the cap (prod backs up every 6 h, home pulls hourly) | Reporting only "deleted in this run" makes 5 of 6 reports look healthy |
