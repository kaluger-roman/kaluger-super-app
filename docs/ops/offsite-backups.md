# Offsite backups (prod -> home)

Prod (`45.133.234.3`, `tutor.kaluger.ru`) dumps its database on its own; the
home dev machine (`home`, Tailscale `100.67.75.106`) pulls every dump over a
restricted SSH key and once a day proves that the newest copy restores. The
admin page («Админ-панель» → «Бэкапы») shows when the copy was last pulled and
the last restore check result.

Spec and design: `specs/036-offsite-backups/`.

## Where things are

Home (`roman-kaluger@home`):

| Path | What |
|---|---|
| `/home/roman-kaluger/prod-backups/backup-*.sql.gz` | Copies of prod dumps (each passed `gzip -t`) |
| `/home/roman-kaluger/prod-backups/logs/pull.log` (`.1`) | Pull log, rotated at 1 MiB |
| `/home/roman-kaluger/prod-backups/logs/restore-check.log` (`.1`) | Restore check log, rotated at 1 MiB |
| `/home/roman-kaluger/prod-backups/.last-restore-check` | mtime = last restore check whose result reached prod (24 h throttle) |
| `/home/roman-kaluger/prod-backups/.lock` | `flock` shared by pull and restore check |
| `/home/roman-kaluger/prod-backups/.verified` | Names of copies that already passed `gzip -t`; unlisted copies are checked on every pull |
| `/home/roman-kaluger/.local/share/offsite-backup/` | Installed copies of the scripts that cron runs |
| `/home/roman-kaluger/.ssh/offsite_backup_ed25519` | Dedicated key, accepted by prod only for the wrapper below |

Prod (`root@45.133.234.3`):

| Path | What |
|---|---|
| `/home/roman-kaluger/kaluger-super-app/backend/backups/backup-*.sql.gz` | Dumps made by the backend (`runBackupJob`, manual «Создать бэкап») |
| `…/backend/backups/backup-*.sql.gz.tmp` | Dump in progress (renamed when complete, orphans removed after 24 h) |
| `…/backend/backups/.offsite-last-pull` | Time of the last successful pull, written by the wrapper |
| `…/backend/backups/.offsite-restore-check.json` | Last restore check result, written by the wrapper |
| `/usr/local/sbin/offsite-backup-ssh` | Forced-command wrapper (`scripts/offsite-backup/prod-ssh-wrapper.sh`) |
| `/root/.ssh/authorized_keys` | One restricted line for the home key |

Sources in the repo: `scripts/offsite-backup/` (`lib.sh`, `pull-backups.sh`,
`restore-check.sh`, `prod-ssh-wrapper.sh`), tests in
`scripts/__tests__/offsite-backup-*.test.mjs`.

## Scheme

```
prod backend ──pg_dump | gzip──> backups/backup-<ts>.sql.gz.tmp ──rename──> backups/backup-<ts>.sql.gz
                                              (every intervalHours, checked hourly)

home cron :17 hourly   pull-backups.sh  ──ssh (offsite key)──> prod wrapper ──rrsync -ro──> backups/
                       gzip -t each new copy, retention 90 days / 20 GiB     └─> writes .offsite-last-pull

home cron :47 hourly   restore-check.sh (runs at most once per 24 h, --force to bypass)
                       newest copy -> docker postgres:16-alpine --network none, data in tmpfs -> counts users/students/lessons
                       ──ssh (offsite key)──> prod wrapper "report-restore-check …" ──> .offsite-restore-check.json

admin page  GET /api/admin/backup/settings -> offsite.lastSyncAt, offsite.restoreCheck
```

- Pull, not push: prod holds no credential to home, so a compromised prod
  cannot touch the copies.
- The home key can only run the wrapper (`restrict`, forced command, `from=`
  home's Tailscale IP). The wrapper allows `rsync --server --sender` through
  `rrsync -ro` (read-only, confined to the backup dir) and one strictly
  validated `report-restore-check` command. Everything else is refused.
- Home is often off. Both jobs run hourly and catch up on the first run after
  the machine comes back; the restore check throttles itself by elapsed time,
  not by wall clock.

## Retention

- Prod: a backup younger than 30 days is never deleted (constant
  `MIN_RETENTION_DAYS`). Older backups are deleted oldest first while the total
  is above the admin limit «Макс. размер (МБ)». If the fresh backups alone are
  over the limit, the admin shows «Лимит превышен…» under the 30-day hint:
  raise the limit. No 20 GiB cap on prod.
- Home: copies older than 90 days (by the timestamp in the file name) are
  deleted after a successful pull; then, if copies exceed 20 GiB, the oldest
  are deleted. The newest copy is never deleted, files with other names (or
  timestamps more than a day in the future) are never touched. A failed pull
  runs no retention; it only removes copies that fail `gzip -t` and pulled
  files with an unexpected or future name. A file over 1 GiB is refused and
  logged as ERROR (the run exits 1).
- The pull asks prod only for names inside the 90-day window and never
  overwrites a copy that is already at home, so a tampered prod cannot replace
  existing copies, and refuses files over 1 GiB (`OFFSITE_MAX_FILE_SIZE`; a
  dump is ~0.5 MB today, raise it if the database grows).
- Known limit: the 20 GiB cap is hard, so a tampered prod that pushes many
  freshly dated files can still push the oldest home copies out over the cap.
  Such deletions show up in `pull.log` as `deleted … (over the … byte cap)`.

## One-time setup

Run these by hand, in this order, with the owner's confirmation. Nothing here
is deployed by CI.

### 1. Home: key

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/offsite_backup_ed25519 -C offsite-backup@home
cat ~/.ssh/offsite_backup_ed25519.pub
```

### 2. Prod: wrapper and restricted key

Copy the wrapper from a checkout of `main` (prod has no `scripts/` dir), e.g.
from home:

```bash
scp ~/kaluger-super-app/scripts/offsite-backup/prod-ssh-wrapper.sh root@100.71.145.114:/tmp/
```

On prod:

```bash
install -m 0755 -o root -g root /tmp/prod-ssh-wrapper.sh /usr/local/sbin/offsite-backup-ssh
rm /tmp/prod-ssh-wrapper.sh
```

Append one line to `/root/.ssh/authorized_keys` (the key is the `.pub` from
step 1, on the same line):

```
from="100.67.75.106",restrict,command="/usr/local/sbin/offsite-backup-ssh /home/roman-kaluger/kaluger-super-app/backend/backups" ssh-ed25519 AAAA... offsite-backup@home
```

### 3. Home: host key and refusal checks

```bash
ssh-keyscan -t ed25519 100.71.145.114 >> ~/.ssh/known_hosts   # compare with prod: ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
SSH="ssh -i ~/.ssh/offsite_backup_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes root@100.71.145.114"
$SSH                       # expect: offsite-backup-ssh: command not allowed
$SSH cat /etc/passwd       # expect: offsite-backup-ssh: command not allowed
$SSH report-restore-check error ../x no_copy   # expect: offsite-backup-ssh: invalid report: unexpected characters
$SSH report-restore-check error x.sql.gz no_copy   # expect: offsite-backup-ssh: invalid report: bad file name
```

### 4. Home: install the scripts and schedule them

Cron runs installed copies, never the dev checkout (its branch changes during
development). Install from a checkout of `main`:

```bash
cd ~/kaluger-super-app && git switch main && git pull
install -d ~/.local/share/offsite-backup
install -m 0755 scripts/offsite-backup/lib.sh scripts/offsite-backup/pull-backups.sh \
  scripts/offsite-backup/restore-check.sh ~/.local/share/offsite-backup/
mkdir -p ~/prod-backups
```

First runs by hand (the first pull fetches everything prod still has):

```bash
~/.local/share/offsite-backup/pull-backups.sh; echo "exit $?"
tail ~/prod-backups/logs/pull.log
~/.local/share/offsite-backup/restore-check.sh --force; echo "exit $?"
tail ~/prod-backups/logs/restore-check.log
```

Then `crontab -e` and add:

```
17 * * * * /home/roman-kaluger/.local/share/offsite-backup/pull-backups.sh
47 * * * * /home/roman-kaluger/.local/share/offsite-backup/restore-check.sh
```

`:17` runs after prod's top-of-the-hour backup, so a new dump reaches home
within about 1 h 10 min. Cron's default `PATH` (`/usr/bin:/bin`) has everything
the scripts need (`rsync`, `ssh`, `flock`, `gzip`, `docker`); the user must be
in the `docker` group.

Check the admin page: «Резервное хранилище: <date>» and «Проверка
восстановления: <date> — успешно (…)» without warnings.

## Operating

Manual runs (safe at any time; a run that finds the lock busy is skipped,
the restore check waits for a running pull):

```bash
~/.local/share/offsite-backup/pull-backups.sh
~/.local/share/offsite-backup/restore-check.sh --force   # without --force it runs only if the last check is older than 24 h
```

Exit codes: `pull-backups.sh` 0 = pulled or skipped, 1 = rsync failed, a
copy was not a valid gzip, or a file was refused as over
`OFFSITE_MAX_FILE_SIZE`, 2 = bad arguments; `restore-check.sh` 0 = success reported (or
throttled), 1 = check failed (still reported) or the report did not reach
prod, 2 = bad arguments.

Overrides (environment, mostly for tests): `OFFSITE_DEST`, `OFFSITE_HOST`,
`OFFSITE_SSH_KEY`, `OFFSITE_RETENTION_DAYS`, `OFFSITE_MAX_BYTES`,
`OFFSITE_LOG_MAX_BYTES`, `OFFSITE_MAX_FILE_SIZE` (1G),
`OFFSITE_RESTORE_INTERVAL_HOURS`, `OFFSITE_PG_IMAGE`,
`OFFSITE_PG_READY_TIMEOUT`, `OFFSITE_RESTORE_TIMEOUT` (1800 s for the
restore), `OFFSITE_QUERY_TIMEOUT` (300 s for every other docker call),
`OFFSITE_PG_DATA_SIZE` (4g tmpfs for the restored data), `OFFSITE_PG_MEMORY`
(6g, no swap, covers the tmpfs), `OFFSITE_STALE_COPY_HOURS` (48; keep it
above the admin «Интервал (часы)»; with automatic backups switched off on prod
the check reports `stale_copy` by design), `OFFSITE_MAX_OWNER_ROLES` (20).

### Admin warnings

| Admin line | Meaning | Look at |
|---|---|---|
| «Резервное хранилище: копирование ещё не выполнялось» | No successful pull ever (or the stamp is unreadable) | setup steps 2–4 |
| «… — давно не обновлялось (больше 24 часов)» | Home off, cron missing, key/host key broken, Tailscale down | `logs/pull.log`, `crontab -l`, manual pull |
| «Проверка восстановления: ещё не выполнялась» | No restore result reached prod yet | `logs/restore-check.log`, manual `--force` |
| «…, но это было больше 48 часов назад» | Checks stopped reaching prod | `logs/restore-check.log`, `crontab -l` |
| «… — ошибка: <reason>» | Check ran and failed | table below, details in `logs/restore-check.log` |
| «Лимит превышен: бэкапы младше 30 дней не удаляются. Увеличьте лимит.» | Fresh backups alone exceed «Макс. размер (МБ)» | raise the limit in the admin |

| Reason code | Admin text | Usual cause |
|---|---|---|
| `no_copy` | в резервном хранилище нет целых копий | nothing pulled yet |
| `stale_copy` | самая свежая копия устарела — новые бэкапы не доходят | pulls stopped: `logs/pull.log` (e.g. «refused, over 1G»: raise `OFFSITE_MAX_FILE_SIZE`) |
| `gzip_corrupt` | архив копии повреждён | disk problem at home |
| `docker_failed` | не удалось запустить временную базу | Docker stopped, image missing (`docker pull postgres:16-alpine`) |
| `restore_failed` | копия не разворачивается (ошибка SQL) | dump/psql mismatch, over `OFFSITE_RESTORE_TIMEOUT`, role creation failed or timed out, more than 20 owner roles; stderr tail in the log |
| `query_failed` | не удалось прочитать данные из временной базы | see log; also a query over `OFFSITE_QUERY_TIMEOUT` |
| `missing_table_<t>` | таблица `<t>` не найдена | schema change or broken dump |
| `empty_table_<t>` | таблица `<t>` пуста | data loss on prod or an empty dump |

## Restoring prod from a home copy

Target: under 15 minutes. Run on the server that should get the data (prod or
a fresh one with Postgres 16, the app deployed and `backend/.env` in place).

1. Pick and verify the newest copy on home, copy it over:

   ```bash
   # newest_backup skips foreign and future-stamped names; prefer the file of
   # the last «check passed for …» line in logs/restore-check.log if it is recent
   FILE=~/prod-backups/$(bash -c 'source ~/.local/share/offsite-backup/lib.sh; newest_backup ~/prod-backups')
   grep 'check passed for' ~/prod-backups/logs/restore-check.log | tail -n 1
   gzip -t "$FILE" && scp "$FILE" root@<server>:/tmp/restore.sql.gz
   ```

2. On the server, stop the backend and restore into a new database (the dump
   expects the role `roman-kaluger`; create it first on a fresh server). Use a
   `psql` from Postgres 16, at least as new as the `pg_dump` that made the dump
   (dumps carry `\restrict` lines):

   ```bash
   pm2 stop backend
   sudo -u postgres psql -c 'CREATE ROLE "roman-kaluger" LOGIN' 2>/dev/null || true
   sudo -u postgres createdb -O roman-kaluger <db>_restored
   gunzip -c /tmp/restore.sql.gz | sudo -u postgres psql -v ON_ERROR_STOP=1 -q -d <db>_restored
   sudo -u postgres psql -d <db>_restored -c 'SELECT (SELECT count(*) FROM users) u, (SELECT count(*) FROM students) s, (SELECT count(*) FROM lessons) l'
   ```

   `<db>` is the database name from `DATABASE_URL` in `backend/.env`.

3. Swap databases and start the backend:

   ```bash
   sudo -u postgres psql -c 'ALTER DATABASE <db> RENAME TO <db>_broken'   # skip on a fresh server
   sudo -u postgres psql -c 'ALTER DATABASE <db>_restored RENAME TO <db>'
   cd /home/roman-kaluger/kaluger-super-app/backend && npx prisma migrate deploy   # expect "No pending migrations"
   pm2 restart backend
   ```

4. Log in to the app and check recent lessons. Drop `<db>_broken` and
   `/tmp/restore.sql.gz` once everything is fine.

Data written after the dump's timestamp is lost; the dump name is its UTC time.

## Updating

- Home scripts: merge to `main`, then repeat the `install` command from setup
  step 4 (from an up-to-date `main` checkout). Cron picks up the new copies on
  the next run.
- Prod wrapper: repeat setup step 2 (`scp` + `install`). The `authorized_keys`
  line does not change.

## Disabling

1. Home: `crontab -e`, remove both lines; optionally `rm -r ~/.local/share/offsite-backup`.
2. Prod: remove the `offsite-backup@home` line from `/root/.ssh/authorized_keys`;
   optionally `rm /usr/local/sbin/offsite-backup-ssh` and the two dot-files in
   the backup dir (the admin then shows «ещё не выполнялось» warnings).
3. Copies in `~/prod-backups/` stay until deleted by hand.

## Security notes

- The home key is root on prod but cannot get a shell: `restrict` disables
  pty and all forwarding, the forced command ignores the requested command
  except for the two allowed forms, and `from=` limits it to home's Tailscale
  address. `rrsync -ro` refuses writes and deletes and confines paths to the
  backup dir. The client cannot set environment variables
  (`PermitUserEnvironment` is off by default).
- `report-restore-check` accepts at most 256 chars of `[A-Za-z0-9_. -]`, an
  exact token count, a backup file name pattern, 1–9 digit counts and a fixed
  reason list; the timestamp is taken from prod's clock.
- Prod has no credential for home; the copies cannot be reached from prod.
- Copies are not encrypted; the home disk already holds the dev environment.
  A dedicated non-root user on prod would be a further hardening (needs ACLs
  on the root-owned backup dir).
