# Contract: `GET /api/admin/backup/settings`

Auth: admin JWT (`authenticateAdmin`), unchanged.

## 200 response

```json
{
  "settings": {
    "enabled": true,
    "intervalHours": 6,
    "maxStorageMb": 300,
    "lastBackupAt": "2026-10-16T14:00:01.000Z"
  },
  "files": [
    { "name": "backup-2026-10-16T14-00-00-058Z.sql.gz", "sizeMb": 0.53, "createdAt": "2026-10-16T14:00:01.000Z" }
  ],
  "totalSizeMb": 301.2,
  "minRetentionDays": 30,
  "storageLimitExceeded": true,
  "offsite": {
    "lastSyncAt": "2026-10-16T14:17:03Z",
    "restoreCheck": {
      "checkedAt": "2026-10-16T05:47:12Z",
      "fileName": "backup-2026-10-16T00-00-01-123Z.sql.gz",
      "status": "success",
      "counts": { "users": 14, "students": 93, "lessons": 2431 }
    }
  }
}
```

- `settings`, `files`, `totalSizeMb`: unchanged. `files` never contains
  `*.sql.gz.tmp` or dot-files.
- `minRetentionDays`: always `30`.
- `storageLimitExceeded`: the size that remains after a cleanup run (without the files cleanup would delete: older than 30 days, oldest first, never the last one), rounded to 0.01 MB, is above `settings.maxStorageMb`. Old files that cleanup will still remove do not raise it.
- `offsite.lastSyncAt`: ISO UTC or `null` (never pulled, missing or corrupt
  stamp).
- `offsite.restoreCheck`: `null`, or success object as above, or
  `{ "checkedAt": "...", "fileName": "..." | null, "status": "error", "error": "таблица lessons пуста" }`
  (`error` is Russian text mapped from the reason code, see data-model.md).
- Corrupt / unreadable dot-files never cause 5xx: the corresponding field is
  `null`.

## Unchanged endpoints

- `PUT /api/admin/backup/settings` — response stays `BackupSettingsResponse`
  (`enabled`, `intervalHours`, `maxStorageMb`, `lastBackupAt`). Validation
  ranges unchanged (10–10000 MB): a limit below the 30-day volume is allowed;
  the warning covers it.
- `POST /api/admin/backup/create` — unchanged contract; internally writes a
  `.tmp` file and renames it.
