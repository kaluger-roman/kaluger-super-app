# Contract: prod SSH forced command `offsite-backup-ssh`

Source: `scripts/offsite-backup/prod-ssh-wrapper.sh`; installed on prod as
`/usr/local/sbin/offsite-backup-ssh` (root, 0755).

## Invocation

`/root/.ssh/authorized_keys`:

```
from="100.67.75.106",restrict,command="/usr/local/sbin/offsite-backup-ssh /home/roman-kaluger/kaluger-super-app/backend/backups" ssh-ed25519 AAAA... offsite-backup@home
```

- `$1` — backup dir (required, must exist, else exit 2).
- Input: `SSH_ORIGINAL_COMMAND` (set by sshd). Env `OFFSITE_RRSYNC`
  (default `/usr/bin/rrsync`) — test-only override.

## Allowed commands

### 1. rsync read

- Match: `SSH_ORIGINAL_COMMAND` starts with `rsync --server --sender `.
- Action: `"$OFFSITE_RRSYNC" -ro "$1"` (rrsync validates the rsync options and
  confines paths to `$1`, read-only, no delete).
- Exit 0 → write `$1/.offsite-last-pull` = `date -u +%Y-%m-%dT%H:%M:%SZ`
  (write `$1/.offsite-last-pull.tmp`, then `mv`). Non-zero → stamp untouched.
- Exit code: rrsync's.

### 2. Restore check report

- Max length of `SSH_ORIGINAL_COMMAND`: 256 chars. Tokens split on spaces with
  globbing disabled; token count must match exactly.
- `report-restore-check success <file> <users> <students> <lessons>`
- `report-restore-check error <file|-> <reason>`
- `<file>`: `^backup-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}(-[0-9]{3})?Z\.sql\.gz$`
- counts: `^[0-9]{1,9}$`
- `<reason>`: `no_copy | stale_copy | gzip_corrupt | docker_failed | restore_failed | query_failed | missing_table_(users|students|lessons) | empty_table_(users|students|lessons)`
- Action: write `$1/.offsite-restore-check.json` (tmp + `mv`):
  - success: `{"checkedAt":"<now>","fileName":"<file>","status":"success","counts":{"users":U,"students":S,"lessons":L}}`
  - error: `{"checkedAt":"<now>","fileName":"<file>"|null,"status":"error","reason":"<reason>"}`
  Counts are written as decimal numbers with leading zeros stripped.
- Exit 0 on write, 1 on validation failure (message on stderr, nothing
  written).

## Everything else

Empty command (interactive login), `scp`, `sftp`, `rsync --server` without
`--sender` (write), any other text → stderr `offsite-backup-ssh: command not allowed`,
exit 1, no file written.

## Client side (home)

- Pull: `rsync -rt --ignore-existing --max-size=1G --info=skip1 --out-format=%n --exclude=*/ --include=/backup-<YYYY-MM-DD>T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]Z.sql.gz --include=/backup-<YYYY-MM-DD>T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9]Z.sql.gz … --exclude=* -e "ssh <opts>" root@100.71.145.114:./ ~/prod-backups/` (two includes per day of the home retention window up to tomorrow; see home-scripts.md)
- Report: `ssh <opts> root@100.71.145.114 report-restore-check success backup-...sql.gz 14 93 2431`
- `<opts>` = `-i ~/.ssh/offsite_backup_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4`
