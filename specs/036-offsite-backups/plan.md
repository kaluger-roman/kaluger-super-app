# Implementation Plan: Копия бэкапов БД на домашней машине и хранение от 30 дней

**Branch**: `036-offsite-backups` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-offsite-backups/spec.md`

## Summary

Prod keeps making `pg_dump | gzip` backups, but now writes them through a
`.tmp` file + rename and never deletes backups younger than 30 days (size
limit applies only to older files; a limit overrun is flagged in the admin).
The home dev machine pulls `*.sql.gz` hourly over SSH/rsync with a dedicated
key that prod confines via `authorized_keys` (`from=`, `restrict`, forced
command) to a wrapper: read-only `rrsync` of the backup dir plus a strictly
validated `report-restore-check` command. The wrapper records the last
successful pull and the last restore-check result as dot-files in the backup
dir; the backend exposes them in `GET /api/admin/backup/settings`, and the
already-mocked admin UI (`BackupSection`, `OffsiteStorageStatus`) is wired to
real data. Home keeps copies 90 days with a 20 GB cap and once a day restores
the newest copy into a throwaway `postgres:16-alpine` container
(`--network none`) to verify `users`/`students`/`lessons` are non-empty.
Ops setup is documented in `docs/ops/offsite-backups.md` and done manually
after merge.

## Technical Context

**Language/Version**: TypeScript 5.x strict (backend Node 20, frontend React); bash (home/prod scripts, cron-safe)
**Primary Dependencies**: Express, Prisma, Effector, MUI (existing); rsync 3.2.x + `rrsync` (prod), OpenSSH, flock, gzip, Docker Engine + `postgres:16-alpine` (home). No new npm dependencies.
**Storage**: PostgreSQL via Prisma — no schema change; new state in files: `$BACKUP_DIR/.offsite-last-pull`, `$BACKUP_DIR/.offsite-restore-check.json` (prod), `/home/roman-kaluger/prod-backups/` (home)
**Testing**: backend Jest (real test DB, tmp `BACKUP_DIR`), frontend Vitest + RTL, scripts `node --test scripts/__tests__/` with stubbed `ssh`/`rrsync`/`docker` and real rsync/gzip/flock
**Target Platform**: prod Ubuntu 24.04 (pm2, root), home Ubuntu 22.04 (user crontab, docker group)
**Project Type**: web (frontend + backend) + ops scripts
**Performance Goals**: new copy at home ≤ 1h10m after creation (pull at :17 hourly); restore check ≈ 1 min at current DB size (~0.5 MB gz)
**Constraints**: home often offline (catch up on next run, throttle by elapsed time not wall clock); prod must not gain any access to home; home dev Postgres 14 untouched; no 20 GB cap on prod; no `--delete` from home
**Scale/Scope**: ~4 backups/day × 0.5 MB; 90 days ≈ 360 files ≈ 200 MB at home; prod 565 files / 301 MB now

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. FSD (frontend) | PASS | New store module in `features/admin/models`, types in `shared/api`, UI stays in `pages/AdminPage`; imports downward only |
| II. Layered MVC | PASS | File/dot-file logic in `services/backup/`; controller `getSettings` only formats; no business logic in controller |
| III. Effector | PASS | New `backupStatus.model.ts` (namespace export), stores fed by `sample` from `getBackupSettingsFx.doneData`, `useUnit` in components |
| IV. Type safety | PASS | `type` only, response types in `backend/src/types/backup.ts` and `frontend/src/shared/api/admin.types.ts`; JSON from dot-files parsed as `unknown` and narrowed |
| V. Consistency | PASS | Flat `services/backup.ts` is split into `services/backup/` (`backup.ts`, `.constants`, `.helpers`, `.types`, `offsiteStatus.ts`) as backend.md requires when touching flat services; mocks + `TODO(auto-feature)` removed |
| VI. Testing | PASS | Jest unit + integration for retention, tmp+rename, dot-file reading, API fields; Vitest for model, helpers, component; node tests for every script path |
| VII. Simplicity | PASS (see Complexity Tracking) | Bash scripts instead of a Node service at home; no new DB columns; retention constants, not settings |

Post-design re-check (after Phase 1): PASS, no new violations.

## Project Structure

### Documentation (this feature)

```text
specs/036-offsite-backups/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admin-backup-settings.md
│   ├── prod-ssh-wrapper.md
│   └── home-scripts.md
└── tasks.md            # /speckit.tasks
```

### Source Code (repository root)

```text
backend/src/
├── services/
│   ├── backup.ts                       # DELETE (moved into folder below)
│   ├── backup/
│   │   ├── index.ts                    # re-exports (keeps `from "../backup"` / `services` imports working)
│   │   ├── backup.ts                   # settings, files, cleanupOldBackups, performBackup (.tmp + rename), createManualBackup, runBackupJob
│   │   ├── backup.constants.ts         # BACKUP_SETTINGS_ID, MIN_RETENTION_DAYS, MIN_BACKUP_SIZE_BYTES, TMP suffix, stale-tmp age, dot-file names, RESTORE_CHECK_ERROR_MESSAGES
│   │   ├── backup.helpers.ts           # parseBackupTimestamp, selectBackupsToDelete, isStorageLimitExceeded, parseLastPull, parseRestoreCheck, stripPrismaParams
│   │   ├── backup.types.ts             # BackupFileInfo
│   │   ├── offsiteStatus.ts            # getOffsiteStatus(): reads dot-files tolerantly
│   │   └── __tests__/                  # helpers + offsiteStatus unit tests (existing services/__tests__/backup.test.ts kept/extended)
│   └── index.ts                        # `export * from "./backup"` (unchanged path)
├── controllers/backup/getSettings.ts   # adds minRetentionDays, storageLimitExceeded, offsite
├── controllers/backup/__tests__/backup.test.ts  # integration: new fields, corrupt dot-files
└── types/backup.ts (+ types/index.ts)  # BackupRestoreCheck*, BackupOffsiteStatus, BackupSettingsFullResponse

frontend/src/
├── shared/api/admin.types.ts           # RestoreCheckCounts, RestoreCheckResult, BackupOffsiteStatus; BackupSettingsFullResponse extended
├── features/admin/models/
│   ├── backupStatus.model.ts           # $minRetentionDays, $storageLimitExceeded, $offsiteLastSyncAt, $restoreCheck
│   ├── index.ts                        # + export * as backupStatusModel
│   └── __tests__/backupStatus.model.test.ts
├── features/admin/index.ts             # + backupStatusModel
└── pages/AdminPage/components/BackupSection/
    ├── BackupSection.tsx               # real stores; limit alert moved under the 30-day hint
    ├── BackupSection.constants.ts      # DELETE (mocks only)
    └── components/OffsiteStorageStatus/
        ├── OffsiteStorageStatus.tsx    # real stores
        ├── OffsiteStorageStatus.constants.ts  # mocks removed
        ├── OffsiteStorageStatus.types.ts      # DELETE (types moved to shared/api) if empty
        └── __tests__/                  # helpers + component tests

scripts/offsite-backup/
├── lib.sh                              # shared bash helpers
├── pull-backups.sh                     # home, hourly
├── restore-check.sh                    # home, hourly, self-throttled to 24 h, --force
└── prod-ssh-wrapper.sh                 # prod forced command (installed as /usr/local/sbin/offsite-backup-ssh)

scripts/__tests__/
├── offsite-backup-wrapper.test.mjs
├── offsite-backup-pull.test.mjs
└── offsite-backup-restore-check.test.mjs

frontend/e2e/admin/backup-offsite-status.spec.ts   # hint + "never" warnings visible

docs/ops/offsite-backups.md             # where copies are, schema, setup prod/home, manual run, restore, disable
CLAUDE.md                               # pointer to docs/ops/offsite-backups.md + home path
```

**Structure Decision**: existing web layout (frontend FSD + backend MVC);
new ops scripts under `scripts/offsite-backup/` tested by the existing
`node --test scripts/__tests__/` CI step. The backup service moves from a
flat file into `services/backup/` because backend.md requires splitting flat
services when they are touched; import paths `../backup` / `../../services`
keep working through `index.ts`.

## Key implementation notes

- `performBackup`: dump to `${final}.tmp`, size check on tmp, `renameSync` to
  final; unlink tmp on every failure path. Return final path.
- `cleanupOldBackups(maxStorageMb, now = new Date())`: remove `*.sql.gz.tmp`
  older than 24 h, then apply `selectBackupsToDelete` (only files older than
  30 days, oldest first, while total > limit, keep ≥ 1). Returns deleted count
  (existing callers/logs unchanged).
- `getSettings` controller: `storageLimitExceeded` from the same `files` list
  used for `totalSizeMb` (one directory scan).
- Restore-check reasons are codes on the wire and in the dot-file; the backend
  maps them to Russian text (`RESTORE_CHECK_ERROR_MESSAGES`), so the wrapper
  never stores free text.
- Existing integration test `create-backup.spec.ts` (e2e) and
  `testSupport` `DELETE /backup/files` keep working (`.sql.gz` filter).
- Memory note (server-side `/root/.claude/projects/-root-super-app/memory/`)
  gets a pointer to `docs/ops/offsite-backups.md` and the home path (spec US5
  AC2), alongside the `CLAUDE.md` pointer.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Bash scripts outside `frontend/`/`backend/` (not TS) | Run under home cron where nvm Node is unavailable; run on prod as an SSH forced command where a Node startup per connection and a dependency on the app's `node_modules` would widen the attack surface | A Node script would need a system Node at home and couples the SSH boundary to deploys |
| Restore check in Docker | Must match prod's Postgres 16 and stay isolated from home's Postgres 14 dev DBs | Restoring into home Postgres 14 = version mismatch and risk to dev data |
