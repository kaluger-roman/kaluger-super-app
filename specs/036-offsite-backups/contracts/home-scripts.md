# Contract: home scripts

All in `scripts/offsite-backup/`, bash, executable, cron-safe (no Node, no
interactive-shell assumptions; tools are looked up on `PATH`, which under cron
is `/usr/bin:/bin` and has everything needed).

Installed on home by copying `lib.sh`, `pull-backups.sh` and
`restore-check.sh` to `~/.local/share/offsite-backup/` from an up-to-date
`main` checkout; crontab runs the installed copies, never the dev checkout
(its branch changes during development). Reinstall = repeat the copy. Each
script sources `lib.sh` from its own directory (`readlink -f "$0"`).

## `pull-backups.sh`

- Args: none.
- Env (defaults): `OFFSITE_DEST=$HOME/prod-backups`,
  `OFFSITE_HOST=root@100.71.145.114`,
  `OFFSITE_SSH_KEY=$HOME/.ssh/offsite_backup_ed25519`,
  `OFFSITE_RETENTION_DAYS=90`, `OFFSITE_MAX_BYTES=21474836480`,
  `OFFSITE_LOG_MAX_BYTES=1048576`, `OFFSITE_MAX_FILE_SIZE=1G`, `OFFSITE_NOW`
  (epoch, tests).
- Exit: 0 = pulled (or skipped because another run holds the lock);
  1 = rsync failed, a copy failed `gzip -t`, or a file was refused as over
  `OFFSITE_MAX_FILE_SIZE` (logged as ERROR).
- Side effects: files in `$OFFSITE_DEST`, log `$OFFSITE_DEST/logs/pull.log`.
- Transfer: `rsync -rt --ignore-existing --max-size=$OFFSITE_MAX_FILE_SIZE`
  (default `1G`) `--info=skip1`, filters `--exclude=*/` first, then for every
  day from the day after the retention cutoff up to tomorrow (UTC)
  `--include=/backup-<day>T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]Z.sql.gz` and the
  same with `-[0-9][0-9][0-9]Z`, then `--exclude=*`. Copies already at home
  are never overwritten; files the retention removed are not pulled again;
  directories are never entered; a pulled name that fails the strict format
  or is stamped more than 1 day ahead is removed right after the transfer;
  a file refused by `--max-size` is logged as ERROR and the run exits 1.
- Verification: every recognised copy missing from `$OFFSITE_DEST/.verified`
  is checked with `gzip -t` before and after the transfer; broken copies are
  removed (and pulled again next time), good ones are added to the ledger.
- Guarantees: never deletes a file because prod no longer has it; on rsync
  failure skips the retention and only removes copies that fail `gzip -t` and
  files just pulled with an unrecognised or future name; the retention never
  deletes the newest recognised copy and never touches files with an
  unrecognised or future (more than 1 day ahead) name.

## `restore-check.sh`

- Args: `[--force]` (ignore the 24 h throttle). Any other arg → usage, exit 2.
- Env: as above plus `OFFSITE_RESTORE_INTERVAL_HOURS=24`,
  `OFFSITE_PG_IMAGE=postgres:16-alpine`, `OFFSITE_RESTORE_TIMEOUT=1800`
  (seconds for the restore; over it → `restore_failed`),
  `OFFSITE_QUERY_TIMEOUT=300` (every other docker call: start, readiness,
  createdb, role and count queries; over it → `docker_failed` for start,
  readiness and createdb, `restore_failed` for the role queries,
  `query_failed` for the table checks),
  `OFFSITE_PG_DATA_SIZE=4g` (restored data in `--tmpfs`, never on disk),
  `OFFSITE_PG_MEMORY=6g` (container `--memory` and `--memory-swap`, covers
  the tmpfs; plus `--cpus 2 --pids-limit 512 --security-opt
  no-new-privileges`), `OFFSITE_STALE_COPY_HOURS=48` (newest copy older than
  this → `stale_copy` without restoring and without touching the stamp; keep
  it above prod's `intervalHours`), `OFFSITE_MAX_OWNER_ROLES=20` (more →
  `restore_failed`). Containers are removed with `docker rm -fv`. Log
  messages are stripped of control characters and cut at 2000 bytes.
- Exit: 0 = skipped by throttle, or result `success` and the report reached
  prod; 1 = the check found an error (still reported) or the report to prod
  failed (log has details); 2 = bad args.
- Side effects: log `$OFFSITE_DEST/logs/restore-check.log`;
  `$OFFSITE_DEST/.last-restore-check` touched (mtime = the run's start time,
  so the hourly cron keeps a 24 h period) only after the report reached prod;
  owner roles are taken only from `ALTER … OWNER TO …;` DDL lines, unexpected
  role names are logged and skipped; a Docker container labelled `offsite-restore-check` exists only
  during the run (removed by trap on any exit, leftovers removed at start).

## `lib.sh`

Sourced helpers (not executable on its own): config defaults, `log LEVEL MSG`
(with `rotate_log`), `acquire_lock_nowait` / `acquire_lock_wait SECONDS`,
`backup_epoch NAME` (prints epoch or fails for unrecognised names),
`now_epoch` (honours `OFFSITE_NOW`), `list_backups DIR` (skips future-stamped
names), `newest_backup DIR`, the `SSH_OPTS` array for `ssh`.
