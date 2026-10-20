---
description: "Task list for 036-offsite-backups"
---

# Tasks: Копия бэкапов БД на домашней машине и хранение от 30 дней

**Input**: Design documents from `/specs/036-offsite-backups/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: REQUIRED (CLAUDE.md: all new code fully covered; spec FR-011 requires script tests). Backend Jest (real test DB, tmp `BACKUP_DIR`, `acquireGlobalTestLock(GLOBAL_TEST_LOCK.BACKUP_SETTINGS)` for anything touching `backup_settings`), frontend Vitest (`npm run test -- <path>`), scripts `node --test scripts/__tests__/`.

**Environment**: code lives on `home`; run commands as `ssh home 'source ~/.nvm/nvm.sh; cd ~/kaluger-super-app/.claude/worktrees/offsite-backups && <cmd>'`. Backend jest flag is `--testPathPatterns` (plural). Never touch prod (45.133.234.3) or `~/prod-backups` on home during implementation; ops setup is a separate manual step after merge (last phase).

**Organization**: grouped by user story (US1–US5 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1..US5

---

## Phase 1: Setup

- [X] T001 Read `docs/conventions/backend.md`, `docs/conventions/backend-testing.md`, `docs/conventions/frontend.md`, `docs/conventions/frontend-testing.md`, `docs/conventions/e2e-testing.md`, plus `specs/036-offsite-backups/research.md` and `contracts/*.md`; make sure the worktree has `frontend/node_modules`, `backend/node_modules` (symlinks from the main checkout) and `backend/.env` + `backend/.env.test` copied from the main checkout, then confirm `cd backend && npm test -- --testPathPatterns=backup` is green before any change

---

## Phase 2: Foundational (blocking)

**Purpose**: restructure the flat backup service (required by backend.md when touching it) and add shared bash helpers. No behaviour change.

- [X] T002 Move `backend/src/services/backup.ts` into folder `backend/src/services/backup/`: `backup.ts` (settings, files, cleanup, performBackup, createManualBackup, runBackupJob), `backup.constants.ts` (`BACKUP_SETTINGS_ID`, `MIN_BACKUP_SIZE_BYTES = 100`, `BACKUP_FILE_EXTENSION = ".sql.gz"`, `PG_DUMP_TIMEOUT_MS = 300000`), `backup.helpers.ts` (`stripPrismaParams`), `backup.types.ts` (`BackupFileInfo = { name; path; sizeMb; createdAt }`), `index.ts` re-exporting the same public API as before (`getBackupSettings`, `updateBackupSettings`, `getBackupFiles`, `getTotalSizeMb`, `cleanupOldBackups`, `performBackup`, `createManualBackup`, `runBackupJob`); delete the flat file. `backend/src/services/index.ts` keeps `export * from "./backup"`; existing imports `../backup` (services/__tests__/backup.test.ts) and `../../../services/backup` (controllers/backup/__tests__/backup.test.ts) must resolve unchanged
- [X] T003 Add `parseBackupTimestamp(name: string): Date | null` to `backend/src/services/backup/backup.helpers.ts` (regex `^backup-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?Z\.sql\.gz$`, UTC, invalid calendar values → null) and unit tests in `backend/src/services/backup/__tests__/backup.helpers.test.ts` (valid with/without ms, `.tmp` suffix → null, foreign name → null, `2026-13-40` → null)
- [X] T004 [P] Create `scripts/offsite-backup/lib.sh` (sourced, `set -euo pipefail` left to callers) per `contracts/home-scripts.md`: config defaults (`OFFSITE_DEST=$HOME/prod-backups`, `OFFSITE_HOST=root@100.71.145.114`, `OFFSITE_SSH_KEY=$HOME/.ssh/offsite_backup_ed25519`, `OFFSITE_RETENTION_DAYS=90`, `OFFSITE_MAX_BYTES=21474836480`, `OFFSITE_LOG_MAX_BYTES=1048576`, `OFFSITE_RESTORE_INTERVAL_HOURS=24`, `OFFSITE_PG_IMAGE=postgres:16-alpine`), `now_epoch` (honours `OFFSITE_NOW`), `log LEVEL MSG` → `$LOG_FILE` lines `YYYY-MM-DDTHH:MM:SSZ LEVEL msg` with `rotate_log` (if size > `OFFSITE_LOG_MAX_BYTES` → `mv $LOG_FILE $LOG_FILE.1`), `acquire_lock_nowait` / `acquire_lock_wait SECONDS` (fd 9 on `$OFFSITE_DEST/.lock`, `flock`), `backup_epoch NAME` (regex `^backup-([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2})-([0-9]{2})-([0-9]{2})(-[0-9]{3})?Z\.sql\.gz$` → `date -u -d ... +%s`, non-zero for unrecognised), `newest_backup DIR` (newest recognised name or empty), `SSH_OPTS` array (`-i $OFFSITE_SSH_KEY -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4`). Mark executable bits on all `scripts/offsite-backup/*.sh` (`git update-index --chmod=+x` is not needed if files are created `chmod 755`; verify `git ls-files -s` shows 100755 after staging)
- [X] T005 [P] Tests for `lib.sh` in `scripts/__tests__/offsite-backup-lib.test.mjs` (style of `scripts/__tests__/dev-stack.test.mjs`: temp dirs, `spawnSync("bash", ["-c", "source lib.sh; ..."])`): `backup_epoch` valid/invalid names, `newest_backup` ignores foreign and `.tmp` names, `rotate_log` moves a log over the limit to `.1`, `acquire_lock_nowait` fails while another process holds the lock

**Checkpoint**: `npm test -- --testPathPatterns=backup` green, `node --test scripts/__tests__/` green.

---

## Phase 3: User Story 1 — Копия бэкапов на домашней машине (P1) MVP

**Goal**: prod writes backups atomically; home pulls new `*.sql.gz` hourly through a read-only forced command and verifies them.

**Independent Test**: with stubs from the tests, a new file in the fixture "prod" dir appears in the fixture home dir with identical content after `pull-backups.sh`, passes `gzip -t`; a `.tmp` file is not pulled; any non-rsync command through the wrapper is refused.

### Tests (write first, must fail)

- [X] T006 [P] [US1] In `backend/src/services/__tests__/backup.test.ts` add `performBackup` tests (mocked `child_process.exec` as already done there; make the mock create the target file named in the command): the shell command writes to `<final>.sql.gz.tmp`, on success only `backup-*.sql.gz` exists (no `.tmp`), on exec failure neither file exists, on a < 100 B dump neither file exists and the error is «Бэкап слишком мал…»; `cleanupOldBackups` removes `*.sql.gz.tmp` older than 24 h and keeps a fresh `.tmp`
- [X] T007 [P] [US1] Create `scripts/__tests__/offsite-backup-wrapper.test.mjs` (rsync part): fixture backup dir + `rrsync` stub (records args and `SSH_ORIGINAL_COMMAND`, exit code from env) passed via `OFFSITE_RRSYNC`; cases: `rsync --server --sender ...` → stub called with `-ro <dir>` and exit code propagated; empty `SSH_ORIGINAL_COMMAND` → exit 1 «command not allowed»; `rsync --server` without `--sender` → refused, stub not called; `scp -f x`, `bash`, `cat /etc/passwd` → refused; missing dir arg → exit 2
- [X] T008 [P] [US1] Create `scripts/__tests__/offsite-backup-pull.test.mjs`: temp `prod/` and `home/` dirs; `ssh` stub on `PATH` that skips options/host, sets `SSH_ORIGINAL_COMMAND` to the remote command and runs the real `scripts/offsite-backup/prod-ssh-wrapper.sh prod/` with `OFFSITE_RRSYNC` = stub that `cd`s into the dir and `exec`s the command (real `rsync --server --sender`); cases: new gz files copied byte-identical; `.tmp` and dot-files not copied; files deleted on prod stay at home (no `--delete`); second run pulls only new files; corrupt `.sql.gz` on prod (not gzip) → deleted at home, ERROR in `logs/pull.log`, exit 1; unreachable host (ssh stub exit 255) → exit 1, ERROR logged, home files untouched; concurrent run while lock held → exits 0 with "skip" in log

### Implementation

- [X] T009 [US1] In `backend/src/services/backup/backup.ts` make `performBackup` dump to `${filePath}.tmp` (`BACKUP_TMP_SUFFIX = ".tmp"` in `backup.constants.ts`), check size on the tmp file, `fs.renameSync(tmp, filePath)` after the check, unlink the tmp on every error path; in `cleanupOldBackups` first delete `*.sql.gz.tmp` files with mtime older than `STALE_TMP_MAX_AGE_MS = 24h` (constant). Keep return value and error texts
- [X] T010 [P] [US1] Create `scripts/offsite-backup/prod-ssh-wrapper.sh` (executable, `set -euo pipefail`, `set -f`): require existing dir `$1` (else exit 2); `SSH_ORIGINAL_COMMAND` starting with `rsync --server --sender ` → run `"${OFFSITE_RRSYNC:-/usr/bin/rrsync}" -ro "$1"`, capture exit code, exit with it (stamp writing is added in T024); everything else → `echo "offsite-backup-ssh: command not allowed" >&2; exit 1`. Header comment: installed as `/usr/local/sbin/offsite-backup-ssh`, invoked from `authorized_keys` forced command (see `docs/ops/offsite-backups.md`)
- [X] T011 [US1] Create `scripts/offsite-backup/pull-backups.sh` (executable, sources `lib.sh` via `$(dirname "$(readlink -f "$0")")`, `LOG_FILE=$OFFSITE_DEST/logs/pull.log`): `mkdir -p`, `acquire_lock_nowait` (busy → log INFO skip, exit 0), `rsync -rt --out-format=%n --include='*.sql.gz' --exclude='*' -e "ssh ${SSH_OPTS[*]}" "$OFFSITE_HOST:./" "$OFFSITE_DEST/"` (no `--delete`, no `--partial`); rsync failure → log ERROR with exit code, exit 1 without touching files; `gzip -t` each transferred `*.sql.gz` (OK → INFO, corrupt → `rm` + ERROR); summary INFO line `pulled N, corrupt N`; exit 1 if any corrupt. Leave a clearly separated retention step stub-free: retention is added in T020
- [X] T012 [US1] Run `node --test scripts/__tests__/` and `cd backend && npm test -- --testPathPatterns=backup`; fix until green

**Checkpoint**: US1 works end to end against fixtures; no UI change yet.

---

## Phase 4: User Story 2 — Гарантия хранения минимум 30 дней (P1)

**Goal**: prod never deletes backups younger than 30 days, admin shows the hint and a limit-exceeded warning; home keeps 90 days with a 20 GB cap.

**Independent Test**: limit below the volume of < 30-day backups → nothing deleted, admin shows «Лимит превышен…» under the 30-day hint; at home a 91-day-old copy is deleted, younger ones stay, newest always stays.

### Tests (write first)

- [X] T013 [P] [US2] In `backend/src/services/backup/__tests__/backup.helpers.test.ts` add tests for `selectBackupsToDelete(files, maxStorageMb, now)` (files `{ name, sizeMb, createdAt }`): over limit with files > 30 days → deletes only those, oldest first, stops when total ≤ limit; all < 30 days and over limit → `[]`; never returns all files (keeps ≥ 1); unparseable name uses `createdAt`; boundary exactly 30 days is kept; and `isStorageLimitExceeded(totalMb, maxMb)` (`>` strict)
- [X] T014 [P] [US2] In `backend/src/services/__tests__/backup.test.ts` replace/extend `cleanupOldBackups` tests with real files named by timestamp (`backup-<iso>.sql.gz`, sizes via `Buffer.alloc`): old files deleted only while over limit; fresh files never deleted even when the limit is 0-ish; keeps at least one file; returns deleted count
- [X] T015 [P] [US2] In `backend/src/controllers/backup/__tests__/backup.test.ts` add: `GET /api/admin/backup/settings` returns `minRetentionDays: 30`; `storageLimitExceeded: false` under limit, `true` when files total > `maxStorageMb` (set `maxStorageMb: 10` via Prisma, write > 10 MB of fresh files); `PUT` response shape unchanged
- [X] T016 [P] [US2] Create `frontend/src/features/admin/models/__tests__/backupStatus.model.test.ts` (fork scope, `allSettled(adminDataModel.getBackupSettingsFx, ...)` with `handlers` mocking the effect): `$minRetentionDays` and `$storageLimitExceeded` take values from the response; defaults `30` / `false` before load
- [X] T017 [P] [US2] Extend `scripts/__tests__/offsite-backup-pull.test.mjs` with retention cases (`OFFSITE_NOW` fixed): home copy 91 days old deleted, 89 days kept; foreign file `notes.txt` / `backup-weird.sql.gz` untouched; when all copies are older than 90 days the newest stays; `OFFSITE_MAX_BYTES` small → oldest deleted until under cap, newest kept even if it alone exceeds the cap; rsync failure → nothing deleted even if old copies exist

### Implementation

- [X] T018 [US2] In `backend/src/services/backup/`: add `MIN_RETENTION_DAYS = 30` to `backup.constants.ts`; implement `selectBackupsToDelete` and `isStorageLimitExceeded` in `backup.helpers.ts`; make `cleanupOldBackups(maxStorageMb, now = new Date())` use `selectBackupsToDelete` (after the stale-tmp sweep from T009); export new helpers/constants via `index.ts`
- [X] T019 [US2] Backend API: in `backend/src/types/backup.ts` add `BackupSettingsFullResponse` (`settings`, `files`, `totalSizeMb`, `minRetentionDays`, `storageLimitExceeded`, `offsite: BackupOffsiteStatus`) with `BackupOffsiteStatus = { lastSyncAt: string | null; restoreCheck: BackupRestoreCheck | null }` and `BackupRestoreCheck` per `data-model.md`; export via `backend/src/types/index.ts`. In `backend/src/controllers/backup/getSettings.ts` return `minRetentionDays: MIN_RETENTION_DAYS`, `storageLimitExceeded` computed from the same `files` list, and `offsite: { lastSyncAt: null, restoreCheck: null }` for now (filled in T026/T033), typed as `BackupSettingsFullResponse`
- [X] T020 [US2] Add retention to `scripts/offsite-backup/pull-backups.sh` (only after rsync success): newest = `newest_backup`; delete recognised copies with `now - backup_epoch > OFFSITE_RETENTION_DAYS*86400` except newest; then sum sizes of recognised copies and delete oldest (by timestamp) except newest while sum > `OFFSITE_MAX_BYTES`; log each deletion and include `deleted N, total X MB` in the summary line
- [X] T021 [US2] Frontend data: in `frontend/src/shared/api/admin.types.ts` add `RestoreCheckCounts`, `RestoreCheckResult` (moved from `OffsiteStorageStatus.types.ts`, `fileName: string | null`), `BackupOffsiteStatus`, and extend `BackupSettingsFullResponse` with `minRetentionDays`, `storageLimitExceeded`, `offsite`; export new types from `frontend/src/shared/api/index.ts`/`@shared` like existing admin types. Create `frontend/src/features/admin/models/backupStatus.model.ts` (stores `$minRetentionDays = 30`, `$storageLimitExceeded = false`; `sample` from `adminDataModel.getBackupSettingsFx.doneData` via `import * as adminDataModel from "./adminData.model"`), export `backupStatusModel` from `features/admin/models/index.ts` and `features/admin/index.ts`
- [X] T022 [US2] In `frontend/src/pages/AdminPage/components/BackupSection/BackupSection.tsx` replace `MOCK_MIN_RETENTION_DAYS` / `MOCK_STORAGE_LIMIT_EXCEEDED` with `useUnit(backupStatusModel.$minRetentionDays)` / `$storageLimitExceeded`; move the «Лимит превышен: бэкапы младше {N} дней не удаляются. Увеличьте лимит.» `StyledLimitAlert` directly under `StyledRetentionHint` (user decision; not after «Всего»); remove `MOCK_MIN_RETENTION_DAYS` / `MOCK_STORAGE_LIMIT_EXCEEDED` and their `TODO(auto-feature)` comments from `BackupSection.constants.ts` (the file keeps only `BACKUP_MOCK_STATE`, still imported by `OffsiteStorageStatus.constants.ts`; T034 deletes the file); keep component < 150 lines
- [X] T023 [P] [US2] Component test `frontend/src/pages/AdminPage/components/BackupSection/__tests__/BackupSection.test.tsx` (RTL + theme + effector `Provider` with forked scope, values set via `fork({ values })`): hint shows «Бэкапы младше 30 дней не удаляются независимо от лимита размера»; alert visible only when `$storageLimitExceeded` is true and is rendered before the files heading «Файлы бэкапов» in DOM order

**Checkpoint**: US1 + US2 deliver the MVP (offsite copy + 30-day guarantee + UI hint/warning).

---

## Phase 5: User Story 3 — Видно, что резервное хранилище актуально (P2)

**Goal**: wrapper records a successful pull; admin shows «Резервное хранилище: …» with a warning when never or > 24 h.

**Independent Test**: after a fixture pull `.offsite-last-pull` exists with the current UTC time; API returns it as `offsite.lastSyncAt`; a 3-day-old stamp renders the warning; a corrupt stamp yields `null` and «копирование ещё не выполнялось».

- [X] T024 [US3] In `scripts/offsite-backup/prod-ssh-wrapper.sh`: after rrsync exits 0 write `date -u +%Y-%m-%dT%H:%M:%SZ` to `$1/.offsite-last-pull.tmp` and `mv` it to `$1/.offsite-last-pull`; non-zero (including 24) → stamp untouched
- [X] T025 [P] [US3] Tests: extend `scripts/__tests__/offsite-backup-wrapper.test.mjs` (stamp written with ISO-UTC format on exit 0; not written/changed on exit 1, 23, 24; not written for refused commands) and `scripts/__tests__/offsite-backup-pull.test.mjs` (successful pull through the real wrapper creates `prod/.offsite-last-pull`, a failed one does not)
- [X] T026 [US3] Backend: `OFFSITE_LAST_PULL_FILE = ".offsite-last-pull"` in `backup.constants.ts`; `parseLastPull(content: string): string | null` in `backup.helpers.ts` (trim, regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`, finite date → `toISOString()`-compatible string as stored); new `backend/src/services/backup/offsiteStatus.ts` with `getOffsiteStatus(): BackupOffsiteStatus` reading the file from the backup dir (missing/unreadable → `null`, never throws; `restoreCheck: null` until T033); export via `index.ts`; use it in `getSettings.ts`. Expose the backup-dir resolver (`getBackupDir`) from `backup.ts` for reuse instead of duplicating the path logic
- [X] T027 [P] [US3] Backend tests: `parseLastPull` cases in `backend/src/services/backup/__tests__/backup.helpers.test.ts` (valid, whitespace/newline, garbage, empty, invalid date); `backend/src/services/backup/__tests__/offsiteStatus.test.ts` (tmp `BACKUP_DIR`: missing file → null, valid → value, garbage → null, file is a directory → null); controller test in `backend/src/controllers/backup/__tests__/backup.test.ts`: `offsite.lastSyncAt` returned, corrupt stamp → `null` with 200
- [X] T028 [US3] Frontend: add `$offsiteLastSyncAt` to `frontend/src/features/admin/models/backupStatus.model.ts` (from `doneData.offsite.lastSyncAt`); in `OffsiteStorageStatus.tsx` replace `MOCK_OFFSITE_LAST_SYNC_AT` with `useUnit(backupStatusModel.$offsiteLastSyncAt)`; remove the corresponding mock + `TODO(auto-feature)` from `OffsiteStorageStatus.constants.ts`
- [X] T029 [P] [US3] Frontend tests: `$offsiteLastSyncAt` in `frontend/src/features/admin/models/__tests__/backupStatus.model.test.ts`; `getOffsiteSyncLine` in `frontend/src/pages/AdminPage/components/BackupSection/components/OffsiteStorageStatus/__tests__/OffsiteStorageStatus.helpers.test.ts` (null → warning «копирование ещё не выполнялось»; 20 min ago → plain; 25 h ago → warning «давно не обновлялось (больше 24 часов)»)

---

## Phase 6: User Story 4 — Регулярная проверка восстановления (P2)

**Goal**: home restores the newest copy daily into a throwaway Postgres 16 container, reports a strictly formatted result; admin shows «Проверка восстановления: …».

**Independent Test**: with a `docker` stub, `restore-check.sh --force` on a fixture copy reports `success <file> U S L` through the real wrapper → `.offsite-restore-check.json` written → API returns `restoreCheck` → UI shows «успешно (…)»; a stubbed empty `lessons` → «ошибка: таблица lessons пуста» as warning; the container is always removed.

- [X] T030 [US4] In `scripts/offsite-backup/prod-ssh-wrapper.sh` add `report-restore-check` per `contracts/prod-ssh-wrapper.md`: reject commands longer than 256 chars; split on spaces (`read -r -a` with `set -f`); exact token counts; regexes for file name, counts (`^[0-9]{1,9}$`, strip leading zeros via `$((10#$n))`), reason allowlist; write `$1/.offsite-restore-check.json` via tmp + `mv` with `checkedAt` from `date -u +%Y-%m-%dT%H:%M:%SZ`, `fileName` `null` for `-`; invalid → stderr, exit 1, nothing written
- [X] T031 [P] [US4] Wrapper tests in `scripts/__tests__/offsite-backup-wrapper.test.mjs`: valid success/error payloads produce exact JSON (parse it); rejected: extra token, missing token, non-numeric count, 10-digit count, unknown reason, `fileName` with `../`, `$(...)`, `*`, quotes, newline, > 256 chars, unknown status; rejected payloads leave an existing JSON file unchanged
- [X] T032 [US4] Create `scripts/offsite-backup/restore-check.sh` (executable, sources `lib.sh`, `LOG_FILE=$OFFSITE_DEST/logs/restore-check.log`) per research D9: args `[--force]` (else usage, exit 2); throttle on `$OFFSITE_DEST/.last-restore-check` mtime vs `OFFSITE_RESTORE_INTERVAL_HOURS` (silent exit 0); `acquire_lock_wait 1800`; pick `newest_backup` (none → `error - no_copy`); `gzip -t` (→ `gzip_corrupt`); `docker rm -f` leftovers by `--filter label=offsite-restore-check`; `docker run -d --rm --label offsite-restore-check --network none -e POSTGRES_HOST_AUTH_METHOD=trust "$OFFSITE_PG_IMAGE"`; `trap` EXIT → `docker rm -f "$cid"`; wait ≤ 60 s for `docker exec $cid pg_isready -U postgres` (→ `docker_failed`, also when `docker run` fails); create roles from `zcat | grep -oE 'OWNER TO [^;]+;'` (validated names) and `createdb restore_check`; restore with `zcat file | docker exec -i $cid psql -v ON_ERROR_STOP=1 -q -U postgres -d restore_check` (→ `restore_failed`, stderr tail to log); for `users students lessons`: `to_regclass` null → `missing_table_<t>`, `count(*)=0` → `empty_table_<t>`, query error → `query_failed`; report via `ssh "${SSH_OPTS[@]}" "$OFFSITE_HOST" report-restore-check ...`; log result; `touch .last-restore-check` only when the report succeeded; exit codes per `contracts/home-scripts.md`
- [X] T033 [US4] Backend: `RESTORE_CHECK_FILE = ".offsite-restore-check.json"` and `RESTORE_CHECK_ERROR_MESSAGES` (table in `data-model.md`, Russian) in `backup.constants.ts`; `parseRestoreCheck(content: string): BackupRestoreCheck | null` in `backup.helpers.ts` (JSON.parse in try/catch → `unknown`, narrow: `checkedAt` valid date, `fileName` string matching backup regex or null, `status` `success` with non-negative integer counts or `error` with string reason → message, unknown reason → «неизвестная ошибка»); `getOffsiteStatus` reads the file (missing/corrupt → `null`)
- [X] T034 [US4] Frontend: add `$restoreCheck` to `backupStatus.model.ts` (from `doneData.offsite.restoreCheck`); `OffsiteStorageStatus.tsx` uses it instead of `MOCK_RESTORE_CHECK`; `OffsiteStorageStatus.helpers.ts` imports `RestoreCheckResult`/`RestoreCheckCounts` from `@shared`; delete `OffsiteStorageStatus.types.ts`; strip `OffsiteStorageStatus.constants.ts` to `HOUR_MS`, `OFFSITE_STALE_HOURS`, `RESTORE_CHECK_STALE_HOURS`, plural forms (no `BACKUP_MOCK_STATE`, no `mockHoursAgo`, no `TODO(auto-feature)`); ensure `BackupSection.constants.ts` is gone and `grep -rn "backupMock\|TODO(auto-feature)" frontend/src` is empty
- [X] T035 [P] [US4] Script tests `scripts/__tests__/offsite-backup-restore-check.test.mjs` with a `docker` stub (records argv to a file; behaviour via env: `run` fail, `pg_isready` never ready, `psql` restore fail, per-table `to_regclass`/count outputs) and the `ssh` stub routing to the real wrapper (fixture prod dir): success → prod JSON has counts, `.last-restore-check` touched, exit 0; empty `lessons` → JSON `reason: empty_table_lessons`, exit 1; missing table; restore fail → `restore_failed`; docker run fail → `docker_failed`; corrupt newest gz → `gzip_corrupt`; no copies → `no_copy` with `fileName: null`; every path that started a container calls `docker rm -f <cid>`; throttle: fresh `.last-restore-check` → no docker calls, exit 0, `--force` bypasses; report failure (ssh exit 255) → `.last-restore-check` not touched, exit 1; `docker run` args include `--network none` and the label; owner roles from the dump are created before restore; bad arg → exit 2
- [X] T036 [P] [US4] Backend tests: `parseRestoreCheck` cases in `backup.helpers.test.ts` (success, each reason mapping incl. `empty_table_lessons` → «таблица lessons пуста», unknown reason, negative/float counts, bad date, invalid JSON, array/null JSON); `offsiteStatus.test.ts` reads the JSON file; controller test: `offsite.restoreCheck` returned, corrupt file → `null` with 200
- [X] T037 [P] [US4] Frontend tests: `$restoreCheck` in `backupStatus.model.test.ts`; `getRestoreCheckLine` in `OffsiteStorageStatus.helpers.test.ts` (null → warning «ещё не выполнялась»; success 9 h ago → plain with plural counts «14 пользователей, 93 ученика, 2431 урок»; success 49 h ago → warning «…, но это было больше 48 часов назад»; error → warning «— ошибка: таблица lessons пуста»); component test `OffsiteStorageStatus/__tests__/OffsiteStorageStatus.test.tsx` rendering both lines from forked scope values (warning lines are `role="alert"`)

---

## Phase 7: User Story 5 — Инструкция по настройке и восстановлению (P3)

**Goal**: a person without context can set up, operate, restore and disable offsite backups from one document.

- [X] T038 [US5] Write `docs/ops/offsite-backups.md` (English per CLAUDE.md language rule for docs; commands verbatim): where copies and logs live on home (`/home/roman-kaluger/prod-backups/`, `logs/pull.log`, `logs/restore-check.log`, `.last-restore-check`); scheme (pull hourly at :17, restore check hourly self-throttled to 24 h at :47, prod backups every `intervalHours`, retention prod ≥ 30 days + admin limit, home 90 days / 20 GB); prod one-time setup (`install -m 0755 -o root -g root scripts/offsite-backup/prod-ssh-wrapper.sh /usr/local/sbin/offsite-backup-ssh`, the exact `authorized_keys` line from `contracts/prod-ssh-wrapper.md`, verifying refusal of `ssh ... root@100.71.145.114` without command); home one-time setup (`ssh-keygen -t ed25519 -N "" -f ~/.ssh/offsite_backup_ed25519 -C offsite-backup@home`, accepting/verifying the prod host key, `mkdir -p ~/prod-backups`, the two crontab lines); manual run of pull and `restore-check.sh --force`; reading logs; how the admin lines map to failures (stale > 24 h, check > 48 h, error reasons table); restore prod/new server from a home copy (create DB, `gunzip -c backup-….sql.gz | psql -v ON_ERROR_STOP=1 "$DATABASE_URL"`, role `roman-kaluger`, `npx prisma migrate deploy` check, pm2 restart) targeting ≤ 15 min; how to update the wrapper after changes; how to disable (remove crontab lines, remove the `authorized_keys` line, optionally delete wrapper); security notes (`from=`, `restrict`, `rrsync -ro`, prod has no access to home, copies are unencrypted)
- [X] T039 [US5] Add a short "Offsite backups" pointer to root `CLAUDE.md` (link to `docs/ops/offsite-backups.md` and the home path `/home/roman-kaluger/prod-backups/`), outside the auto-generated "Active Technologies" list
- [X] T040 [US5] Add a project memory note on the server: create `/root/.claude/projects/-root-super-app/memory/ops_offsite_backups.md` (frontmatter like sibling files) with the doc path, home copy path, wrapper location and cron times, and one index line in `/root/.claude/projects/-root-super-app/memory/MEMORY.md` under "Project Notes" (this is the server's Claude memory, not the prod app; editing it is allowed)

---

## Phase 8: Polish & cross-cutting

- [X] T041 [P] E2E: read `docs/conventions/e2e-testing.md`, add `frontend/e2e/admin/backup-offsite-status.spec.ts` (or extend `frontend/e2e/admin/create-backup.spec.ts` if the conventions prefer one spec per page): admin «Бэкапы» tab shows the 30-day hint and both «Резервное хранилище: копирование ещё не выполнялось» / «Проверка восстановления: ещё не выполнялась» warnings on a clean e2e backup dir; run it locally per memory note `e2e_local_backend_setup.md`
- [X] T042 Full verification on home: `node --test scripts/__tests__/`; `cd backend && npm test && npm run lint && npm run build && npm run format:check`; `cd frontend && npm test && npm run lint && npx tsc --noEmit && npm run find-cycle && npm run format:check`; `bash -n scripts/offsite-backup/*.sh`; `git ls-files -s scripts/offsite-backup` shows mode 100755 for the `.sh` entry points
- [X] T043 Re-read `docs/conventions/backend.md` and `docs/conventions/frontend.md` and check every new/changed file (named exports, arrow functions, `type`, index re-exports, no deep imports, models < 200 lines, components < 150 lines, no inline styles, minimal comments, Russian user-facing text); confirm no `TODO(auto-feature)` / `backupMock` left anywhere and `docs/mockups/036-offsite-backups/index.md` mentions the alert now sits under the 30-day hint
- [X] T044 Manual smoke on home per `quickstart.md` §"Manual checks" (dev stack, fake dot-files) and §4 real-Docker restore of a dev dump into `/tmp/offsite-smoke` (never `~/prod-backups`, never prod): success counts in log, container removed

---

## Phase 9: Ops setup (MANUAL, after merge — NOT executed by /speckit.implement)

- [ ] T045 (SKIPPED by implementation: manual ops after merge) (manual, owner confirmation required, after merge and deploy) Follow `docs/ops/offsite-backups.md`: generate home key, install wrapper on prod, add the restricted `authorized_keys` line, verify refusals, first manual pull and `restore-check.sh --force`, add crontab lines, confirm admin shows fresh «Резервное хранилище» and «Проверка восстановления — успешно» without warnings. Implementation agents MUST skip this task

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. T002 blocks all backend tasks; T004 blocks all script tasks.
- US1 (T006–T012) → US2 (T013–T023): US2's home retention edits `pull-backups.sh` from T011; backend cleanup edits `backup.ts` after T009.
- US3 (T024–T029) depends on T010 (wrapper), T019 (response type/controller), T021 (model file).
- US4 (T030–T037) depends on T024 (wrapper), T026 (`offsiteStatus.ts`), T028 (model + component file).
- US5 (T038–T040) can start after US1–US4 designs are stable (docs reference final script names/flags); best after T032.
- Polish after all stories; Phase 9 never during implementation.
- Same-file sequencing (no [P] between them): `prod-ssh-wrapper.sh` T010 → T024 → T030; `pull-backups.sh` T011 → T020; `backup.ts` T002 → T009 → T018 → T026; `getSettings.ts` T019 → T026 → T033; `backupStatus.model.ts` T021 → T028 → T034; `admin.types.ts` T021 only.

## Parallel Examples

- Phase 2: T003 (backend helper) ∥ T004 + T005 (bash lib).
- US1 tests: T006 ∥ T007 ∥ T008; then T009 ∥ T010, then T011.
- US2 tests: T013 ∥ T014 ∥ T015 ∥ T016 ∥ T017; implementation T018 ∥ T020 ∥ T021.
- US3: T025 ∥ T027 ∥ T029 after their implementation tasks.
- US4: T031 ∥ T035 ∥ T036 ∥ T037 after T030/T032/T033/T034.

## Implementation Strategy

1. MVP = Phase 1–4 (US1 + US2): atomic prod backups, 30-day floor, offsite pull with 90-day/20 GB retention, hint + limit warning in admin.
2. Then US3 (observability of the pull), US4 (restore check), US5 (docs) — each independently testable and shippable in the same PR.
3. Finish with Polish; ops setup (Phase 9) is done manually by the owner after merge.
