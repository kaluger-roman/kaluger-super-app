# Research: 036-offsite-backups

All facts below were checked on 2026-10-16 on prod (45.133.234.3) and home
(read-only inspection).

## Environment facts

| Item | Prod | Home |
|---|---|---|
| OS | Ubuntu 24.04 | Ubuntu 22.04 |
| rsync | 3.2.7, `/usr/bin/rrsync` (python, `-ro`/`-wo`/`-no-del`) | present, `/usr/bin/rsync` |
| Postgres | 16.15 (`pg_dump` 16.15) | apt Postgres 14 (dev DBs, must not be touched) |
| Docker | n/a | Engine 29, socket `root:docker`, user `roman-kaluger` in `docker` group, image `postgres:16-alpine` already pulled |
| Tailscale IP | `100.71.145.114` | `100.67.75.106` |
| Backup dir | `/home/roman-kaluger/kaluger-super-app/backend/backups` (root-owned, 565 files, ~301 MB) | `/home/roman-kaluger/prod-backups/` (new) |
| Repo checkout | NOT a git checkout with `scripts/`: deploy rsyncs only `frontend/build`, `backend/dist`, `backend/prisma`, `package*.json` | main checkout `~/kaluger-super-app` (on `main`) |
| Misc | backend runs as root under pm2 (cwd `backend/`), `.env` has `?schema=public`, sshd `PermitRootLogin yes`, `PasswordAuthentication no` | `flock`, `gzip`, `zcat` in `/usr/bin`, no user crontab yet, Node only via nvm (interactive) |

Dump facts: dumps contain 21 `ALTER ... OWNER TO "roman-kaluger"` lines and
nothing else role-specific; header `-- Dumped by pg_dump version 16.15`.
Prisma table names (`@@map`): `users`, `students`, `lessons`.

## Decisions

### D1. Pull over SSH + rsync, prod-side forced-command wrapper

- Decision: home runs `rsync -rt --include='*.sql.gz' --exclude='*'` over
  `ssh -i ~/.ssh/offsite_backup_ed25519 root@100.71.145.114`. Prod
  `/root/.ssh/authorized_keys` line:
  `from="100.67.75.106",restrict,command="/usr/local/sbin/offsite-backup-ssh /home/roman-kaluger/kaluger-super-app/backend/backups" ssh-ed25519 AAAA... offsite-backup@home`.
  The wrapper (`scripts/offsite-backup/prod-ssh-wrapper.sh`, installed by copy)
  dispatches on `SSH_ORIGINAL_COMMAND`.
- Rationale: `restrict` disables pty, port/agent/X11 forwarding and
  `~/.ssh/rc`; `from=` pins the source to home's Tailscale address; `rrsync
  -ro` confines rsync to the dir, read-only, no delete. Prod never gets a
  credential to home (SC-004).
- Alternatives: push from prod (prod would hold write access to home; a
  compromised prod could wipe the copy) — rejected by spec; dedicated
  non-root user (cleaner, but backups dir is root-owned 0755 and files 0644,
  the wrapper must write dot-files into that dir, and backend runs as root;
  a separate user would need group/ACL changes on prod; `restrict`+forced
  command already removes shell access, so the gain is small) — rejected
  for simplicity, documented as a possible hardening in ops doc.

### D2. Wrapper installed by copy to `/usr/local/sbin/offsite-backup-ssh`

- Decision: ops step `install -m 0755 -o root -g root scripts/offsite-backup/prod-ssh-wrapper.sh /usr/local/sbin/offsite-backup-ssh`
  (from a fresh checkout / `scp` from home). Not deployed by CI.
- Rationale: prod has no `scripts/` (deploy rsyncs only build artifacts);
  adding it to `deploy.yml` needs the `workflow` token scope and would let
  every deploy silently change an SSH security boundary. A manual install
  keeps the forced command stable and reviewed.
- Alternatives: rsync `scripts/offsite-backup/` in deploy.yml — rejected
  (see above).

### D3. Wrapper protocol

- `rsync --server --sender ...` (prefix check) → run `rrsync -ro "$DIR"`
  (rrsync re-reads `SSH_ORIGINAL_COMMAND` and validates options itself),
  remember exit code; on `0` atomically write `$DIR/.offsite-last-pull`
  (`date -u +%Y-%m-%dT%H:%M:%SZ`, tmp + `mv`); exit with rrsync's code.
  Exit code 24 (vanished files) is NOT success: the stamp is only for a
  clean run, the next hourly run retries.
- `report-restore-check <args>` → strict validation, then atomically write
  `$DIR/.offsite-restore-check.json`. Grammar (tokens split on single
  spaces, globbing off, whole command ≤ 256 chars):
  - `report-restore-check success <file> <users> <students> <lessons>`
  - `report-restore-check error <file|-> <reason>`
  - `<file>` = `^backup-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}(-[0-9]{3})?Z\.sql\.gz$`
  - counts = `^[0-9]{1,9}$`
  - `<reason>` ∈ `no_copy`, `stale_copy`, `gzip_corrupt`, `docker_failed`,
    `restore_failed`, `query_failed`, `missing_table_{users,students,lessons}`,
    `empty_table_{users,students,lessons}`
  - `checkedAt` is taken from prod's clock at write time, not from the
    payload (nothing to validate, home clock skew irrelevant).
- Anything else (empty command = interactive shell, `scp`, `rsync --server`
  without `--sender`, extra tokens, bad chars) → message to stderr, exit 1,
  nothing written.
- rrsync path: `${OFFSITE_RRSYNC:-/usr/bin/rrsync}`. The override exists only
  for tests; under `restrict` + `PermitUserEnvironment no` (default) the
  client cannot inject env vars.

### D4. Prod backup: temp file + rename

- Decision: `performBackup` writes `backup-<ts>.sql.gz.tmp`, checks
  `size >= 100` bytes, then `fs.renameSync` to `backup-<ts>.sql.gz`. On any
  error the tmp file is removed. `cleanupOldBackups` also removes
  `*.sql.gz.tmp` older than 24 h (orphans after a hard kill / pm2 restart
  mid-dump; the dump timeout is 5 min, so 24 h never hits a live dump).
- Rationale: rename in one dir is atomic; `.tmp` does not match the
  `*.sql.gz` include on home or `getBackupFiles` on prod.

### D5. Prod retention: 30-day floor by filename timestamp

- Decision: `MIN_RETENTION_DAYS = 30` constant. Age = UTC timestamp parsed
  from `backup-YYYY-MM-DDTHH-MM-SS(-mmm)?Z.sql.gz`; unparseable → file mtime.
  Candidates = files older than 30 days, oldest first; delete while total >
  `maxStorageMb`; keep ≥ 1 file overall (existing invariant). Pure selector
  `selectBackupsToDelete(files, maxStorageMb, now)` in `backup.helpers.ts`,
  tested without fs.
- `storageLimitExceeded` = what remains after a simulated cleanup (rounded to
  0.01 MB like `totalSizeMb`) is above `maxStorageMb`, computed on every GET,
  so files cleanup will still remove do not raise it. No 20 GB cap on prod.

### D6. Backend reads two dot-files, tolerant

- `.offsite-last-pull` → `offsite.lastSyncAt` (`string | null`): trimmed
  content must match ISO-UTC regex and parse to a finite date, else `null`.
- `.offsite-restore-check.json` → `offsite.restoreCheck`: JSON parse in
  try/catch; shape validated (status, counts as non-negative integers,
  reason from the known list → Russian message; unknown reason → «неизвестная
  ошибка»), else `null`. Missing / unreadable / corrupt → `null`, never a
  500 (spec edge case).
- Dot-files are excluded from `getBackupFiles` already (`endsWith(".sql.gz")`)
  and from home's rsync include.

### D7. Home scripts are plain bash, installed to a stable dir and run by user crontab

- Files: `scripts/offsite-backup/lib.sh` (shared config, logging with
  rotation, lock, timestamp parsing, ssh command), `pull-backups.sh`,
  `restore-check.sh`, `prod-ssh-wrapper.sh`.
- Install (ops step, repeated after every change merged to `main`):
  `install -m 0755 scripts/offsite-backup/{lib.sh,pull-backups.sh,restore-check.sh} ~/.local/share/offsite-backup/`
  from an up-to-date `main` checkout. The scripts locate `lib.sh` next to
  themselves, so the installed copies are self-contained.
- Crontab (no sudo):
  `17 * * * * /home/roman-kaluger/.local/share/offsite-backup/pull-backups.sh`
  `47 * * * * /home/roman-kaluger/.local/share/offsite-backup/restore-check.sh`
  :17 is after prod's hh:00 backup, so SC-001 (≤ 1h10m) holds with margin.
- Rationale: nvm Node is unavailable under cron; bash + coreutils + rsync +
  flock + docker are in `/usr/bin`. Cron must not run the dev checkout
  `~/kaluger-super-app` directly: its branch changes during development, so a
  half-finished branch would silently become the backup code. Installed copies
  change only on an explicit reinstall.
- Config via env with defaults (tests override): `OFFSITE_DEST`
  (`$HOME/prod-backups`), `OFFSITE_HOST` (`root@100.71.145.114`),
  `OFFSITE_SSH_KEY` (`$HOME/.ssh/offsite_backup_ed25519`),
  `OFFSITE_RETENTION_DAYS` (90), `OFFSITE_MAX_BYTES` (20 GiB),
  `OFFSITE_LOG_MAX_BYTES` (1 MiB), `OFFSITE_RESTORE_INTERVAL_HOURS` (24),
  `OFFSITE_PG_IMAGE` (`postgres:16-alpine`), `OFFSITE_NOW` (epoch seconds,
  tests only).
- ssh options: `-i $KEY -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4`
  (host key must already be in `known_hosts`, ops step).

### D8. Pull run algorithm

1. `mkdir -p $DEST/logs`; `exec 9>$DEST/.lock; flock -n 9` → if busy, log
   "skip: already running", exit 0.
2. `rsync -rt --ignore-existing --out-format='%n' --include='backup-<day>T*.sql.gz'… --exclude='*' -e "ssh ..." "$HOST:./" "$DEST/"`
   (one include per day inside the home retention window, up to tomorrow)
   (no `--delete`, no `--partial`: rsync writes into a hidden temp file and
   renames only after a checksum-verified transfer).
3. rsync failed → log ERROR with exit code, `gzip -t` the files it did
   transfer, skip retention, exit non-zero.
4. For each transferred `*.sql.gz` from the out-format list: `gzip -t`; OK →
   log; corrupt → delete the local file, log ERROR (it is not a copy; the next
   run re-fetches it; a corrupt prod file is then reported every hour).
5. Retention (only on rsync success): among names with a parseable timestamp,
   newest = max timestamp; delete those older than 90 days except newest;
   then while total bytes of recognised files > 20 GiB delete oldest except
   newest. Unrecognised names untouched and not counted.
6. Log summary line (`pulled N, verified N, corrupt N, deleted N, total X MB`).

Since every file that stays in `$DEST` passed `gzip -t`, "newest intact copy"
= newest recognised file at the moment the lock is free.

### D9. Restore check algorithm

1. Throttle: if `$DEST/.last-restore-check` (mtime = start of the last
   reported run) is younger than 24 h − 30 min and no `--force` → exit 0
   silently. A `stale_copy` run does not touch it.
2. Take the same lock as pull, waiting (`flock -w 1800 9`): a check never
   sees a file between rsync rename and `gzip -t`, and pull just skips while a
   check runs (≈1 min for the current DB size).
3. Pick newest recognised file; none → result `error - no_copy`; older than
   48 h → `stale_copy` (no docker); `gzip -t` again → `gzip_corrupt`.
4. Remove leftovers: `docker ps -aq --filter label=offsite-restore-check` →
   `docker rm -fv`. Start `docker run -d --rm --label offsite-restore-check
   --network none --memory 6g --memory-swap 6g --cpus 2 --pids-limit 512
   --security-opt no-new-privileges --tmpfs /var/lib/postgresql/data:rw,size=4g
   -e POSTGRES_HOST_AUTH_METHOD=trust $IMAGE` (restored PII never reaches the
   home disk or swap); `trap` on EXIT always `docker rm -fv` the container.
   Every docker call is bounded by `timeout $OFFSITE_QUERY_TIMEOUT` (300 s),
   the restore itself by `$OFFSITE_RESTORE_TIMEOUT` (1800 s). `--network none`: no ports, no access
   to/from home's Postgres 14. Wait up to 60 s for `pg_isready`; fail →
   `docker_failed`.
5. Create the owner roles the dump expects: names from `ALTER … OWNER TO
   <role>;` DDL lines only, validated against `^"?[A-Za-z0-9_-]+"?$` (others
   logged and skipped), at most 20, all `CREATE ROLE`s in one psql call
   (failure or timeout → `restore_failed`);
   `createdb restore_check`. Then
   `zcat file | docker exec -i $C psql -v ON_ERROR_STOP=1 -q -U postgres -d restore_check`
   → non-zero = `restore_failed` (details to log).
6. For `users`, `students`, `lessons`: `to_regclass('public.<t>')` null →
   `missing_table_<t>`; `count(*) = 0` → `empty_table_<t>`; query error →
   `query_failed`.
7. Report: `ssh ... "$HOST" "report-restore-check success <file> <u> <s> <l>"`
   (or `error <file|-> <reason>`); log result. Only if the report succeeded
   `touch $DEST/.last-restore-check` — otherwise the next hourly run repeats
   the check, so the admin is not left without a result.
- Alternatives: `pg_restore` from custom format (needs changing prod dump
  format — out of scope); ignore OWNER errors without `ON_ERROR_STOP` (masks
  real errors); restore into home Postgres 14 (version mismatch, touches dev
  instance) — rejected.

### D10. Log rotation

`lib.sh` `rotate_log`: before writing, if `$LOG` > `OFFSITE_LOG_MAX_BYTES`,
`mv $LOG $LOG.1` (one generation). Max ~2 MiB per log. Log lines:
`2026-10-16T14:17:03Z LEVEL message`. Logs: `$DEST/logs/pull.log`,
`$DEST/logs/restore-check.log`.

### D11. Testing strategy for scripts

`node --test scripts/__tests__/` (already in CI, `ci.yml:272`), same style as
`dev-stack.test.mjs`: temp dirs, copy the scripts, stub binaries on `PATH`.
- `ssh` stub: drops options/host and runs the remote command through the real
  wrapper (`SSH_ORIGINAL_COMMAND` set, `OFFSITE_RRSYNC` = an rrsync stub that
  `cd`s into the fixture prod dir and execs the real `rsync --server ...`).
  This exercises pull → wrapper → stamp end to end with real rsync and gzip.
- `docker` stub: records calls, scriptable outcomes (start fail, psql fail,
  counts output) via env; asserts `rm -f` always called.
- Time via `OFFSITE_NOW`.
- A real-Docker restore smoke test is a manual quickstart step (not in CI).

### D12. Frontend wiring

- New fields go top-level in `GET /api/admin/backup/settings` (they depend on
  files/dot-files, not on the DB row); `PUT` response unchanged (the model
  already refetches GET after PUT/create).
- Model: `adminData.model.ts` is ~185 lines (limit 200), so the 4 new stores
  live in a new `features/admin/models/backupStatus.model.ts`
  (`$minRetentionDays`, `$storageLimitExceeded`, `$offsiteLastSyncAt`,
  `$restoreCheck`) fed by `adminDataModel.getBackupSettingsFx.doneData`,
  exported as `backupStatusModel`.
- Types: `RestoreCheckResult`/`RestoreCheckCounts` move to
  `shared/api/admin.types.ts` (as the mockup TODO says).
- Remove `BackupSection.constants.ts` (mocks only) and mock exports from
  `OffsiteStorageStatus.constants.ts`; keep thresholds and plural forms.
- Move the «Лимит превышен…» alert under the 30-day hint (user decision at
  the mockup checkpoint), not after the file list.
