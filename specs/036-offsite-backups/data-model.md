# Data Model: 036-offsite-backups

No Prisma schema change. All new data lives in files; the API adds computed
fields.

## Backup file (prod)

- Path: `$BACKUP_DIR/backup-<ts>.sql.gz`, `<ts>` = `new Date().toISOString()`
  with `:` and `.` replaced by `-` (UTC), e.g.
  `backup-2026-10-16T14-00-00-058Z.sql.gz`.
- In-progress: `backup-<ts>.sql.gz.tmp` (never listed, never pulled; orphans
  older than 24 h removed by cleanup).
- Age: from `<ts>` (regex
  `^backup-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})(?:-(\d{3}))?Z\.sql\.gz$`),
  fallback mtime.
- Lifecycle: `.tmp` (writing) → renamed (complete, size ≥ 100 B) → deleted
  by cleanup only if age > 30 days AND total > `maxStorageMb` AND not the last
  file.

## Offsite pull stamp (prod)

- Path: `$BACKUP_DIR/.offsite-last-pull`
- Content: one line, `YYYY-MM-DDTHH:MM:SSZ` (prod clock, UTC), written by the
  wrapper via tmp + `mv` after rrsync exit 0.
- Reader rule: trimmed content matches
  `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$` and parses → ISO string; otherwise
  `null`.

## Restore check result (prod)

- Path: `$BACKUP_DIR/.offsite-restore-check.json`, written by the wrapper via
  tmp + `mv` after validating the `report-restore-check` command.
- Success:
  ```json
  {"checkedAt":"2026-10-16T05:47:12Z","fileName":"backup-2026-10-16T00-00-01-123Z.sql.gz","status":"success","counts":{"users":14,"students":93,"lessons":2431}}
  ```
- Error:
  ```json
  {"checkedAt":"2026-10-16T05:47:12Z","fileName":null,"status":"error","reason":"no_copy"}
  ```
  `fileName` is `null` when the payload had `-`.
- Reasons → API `error` text (Russian, `RESTORE_CHECK_ERROR_MESSAGES` in
  `backup.constants.ts`):

  | reason | error |
  |---|---|
  | `no_copy` | в резервном хранилище нет целых копий |
  | `stale_copy` | самая свежая копия устарела — новые бэкапы не доходят |
  | `gzip_corrupt` | архив копии повреждён |
  | `docker_failed` | не удалось запустить временную базу |
  | `restore_failed` | копия не разворачивается (ошибка SQL) |
  | `query_failed` | не удалось прочитать данные из временной базы |
  | `missing_table_<t>` | таблица `<t>` не найдена |
  | `empty_table_<t>` | таблица `<t>` пуста |
  | anything else | неизвестная ошибка |

  `<t>` ∈ `users`, `students`, `lessons`.
- Reader rule: unreadable / invalid JSON / wrong shape (bad `checkedAt`, counts
  not non-negative integers, unknown status) → `null`.

## Home copy store

- Dir: `/home/roman-kaluger/prod-backups/` (`OFFSITE_DEST`)
  - `backup-*.sql.gz` — copies (each passed `gzip -t`)
  - `logs/pull.log`, `logs/pull.log.1`, `logs/restore-check.log`,
    `logs/restore-check.log.1` — rotated at 1 MiB
  - `.lock` — shared `flock` file for pull and restore check
  - `.last-restore-check` — mtime = last restore check whose result reached
    prod (throttle)
- Retention (only after a successful rsync): delete recognised copies older
  than 90 days; then while recognised total > 20 GiB delete oldest; never the
  newest recognised copy; unrecognised or future names are never touched or
  counted by the retention (a file just pulled with such a name is removed by
  the post-transfer check instead).

## API: backup settings (computed fields)

`GET /api/admin/backup/settings` response gains top-level:

| Field | Type | Source |
|---|---|---|
| `minRetentionDays` | `number` (30) | `MIN_RETENTION_DAYS` |
| `storageLimitExceeded` | `boolean` | the size that remains after a cleanup run (without the files cleanup would delete: older than 30 days, oldest first, never the last one), rounded to 0.01 MB, is above `settings.maxStorageMb` |
| `offsite.lastSyncAt` | `string \| null` | `.offsite-last-pull` |
| `offsite.restoreCheck` | `BackupRestoreCheck \| null` | `.offsite-restore-check.json` |

```ts
type BackupRestoreCheckCounts = { users: number; students: number; lessons: number };
type BackupRestoreCheck =
  | { checkedAt: string; fileName: string | null; status: "success"; counts: BackupRestoreCheckCounts }
  | { checkedAt: string; fileName: string | null; status: "error"; error: string };
```

## Frontend state (`features/admin/models/backupStatus.model.ts`)

| Store | Type | Initial | Set from |
|---|---|---|---|
| `$minRetentionDays` | `number` | `30` | `getBackupSettingsFx.doneData.minRetentionDays` |
| `$storageLimitExceeded` | `boolean` | `false` | `.storageLimitExceeded` |
| `$offsiteLastSyncAt` | `string \| null` | `null` | `.offsite.lastSyncAt` |
| `$restoreCheck` | `RestoreCheckResult \| null` | `null` | `.offsite.restoreCheck` |

Status-line derivation (pure helpers, existing
`OffsiteStorageStatus.helpers.ts`): sync line warning if `null` or older than
24 h; restore line warning if `null`, `status === "error"` or older than 48 h.
