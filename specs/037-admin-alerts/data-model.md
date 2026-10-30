# Data Model: 037-admin-alerts

One migration `YYYYMMDDHHMMSS_037_admin_alerts` (timestamp at creation time):
two enums, two tables, one column on `backup_settings`.

## Prisma schema additions

```prisma
enum AdminAlertSeverity {
  critical
  warning
}

enum AdminAlertEmailStatus {
  pending
  sent
  failed
  skipped_no_email
  skipped_disabled
}

model AdminAlert {
  id                   String                 @id @default(cuid())
  type                 String                 @db.VarChar(64)
  // Equals `type` while the alert is active, NULL once resolved:
  // at most one active alert per type (NULLs are distinct in a unique index).
  activeType           String?                @unique @db.VarChar(64)
  severity             AdminAlertSeverity
  title                String                 @db.VarChar(200)
  description          String
  eventKey             String?                @db.VarChar(200)
  openedAt             DateTime               @default(now())
  lastSeenAt           DateTime               @default(now())
  occurrences          Int                    @default(1)
  resolvedAt           DateTime?
  readAt               DateTime?
  openEmailStatus      AdminAlertEmailStatus
  openEmailAttempts    Int                    @default(0)
  openEmailError       String?
  resolveEmailStatus   AdminAlertEmailStatus?
  resolveEmailAttempts Int                    @default(0)
  resolveEmailError    String?

  @@index([resolvedAt])
  @@map("admin_alerts")
}

model AdminSettings {
  id                String   @id @default(cuid())
  alertEmail        String?  @db.VarChar(254)
  alertEmailEnabled Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("admin_settings")
}

model BackupSettings {
  // existing fields …
  enabledChangedAt DateTime @default(now())
}
```

Migration SQL, after the generated DDL:

```sql
UPDATE "backup_settings" SET "enabledChangedAt" = "updatedAt";
```

## AdminAlert

| Field | Rules |
|---|---|
| `type` | code from a definition (`backup_failed`, …); not an enum, so new types need no migration (FR-007) |
| `activeType` | `= type` on create; `NULL` on resolve in the same update as `resolvedAt` |
| `severity`, `title` | copied from the definition at open time |
| `description` | from the check; trimmed to 1000 chars (`ALERT_DESCRIPTION_MAX_LENGTH`) with `…` |
| `eventKey` | last event key; `occurrences += 1` when a new non-null key differs from the stored one |
| `lastSeenAt` | `now` on every applied active result |
| `readAt` | set by «Прочитано» / «Отметить все прочитанными» on active alerts only; never reset |
| `open*` | status chosen at open time from settings (see below); attempts ≤ 5; error ≤ 500 chars |
| `resolve*` | `NULL` status while active; set on resolve |

### Lifecycle

```text
          condition holds, no active row
 (none) ───────────────────────────────▶ ACTIVE (unread)
                                           │  repeat: lastSeenAt, description,
                                           │  occurrences (new eventKey only)
                                           │
                       «Прочитано» ────────▶ ACTIVE (read)  (repeat keeps readAt)
                                           │
              condition no longer holds    ▼
                                         RESOLVED (activeType = NULL, resolvedAt)
                                           │ resolvedAt older than 90 days
                                           ▼
                                         deleted
```

A new occurrence after resolve creates a new row (US2-3), unread, with its own
letters.

### Email state machine (per letter: open, resolve)

```text
open created:   no address → skipped_no_email (final)
                switch off → skipped_disabled (final)
                else       → pending
resolve created: open is skipped_* → same skipped_* (final)
                 else             → pending
dispatch (pending | failed with attempts < 5; resolve waits until open is
          sent or failed with attempts = 5):
  settings now: no address → skipped_no_email; off → skipped_disabled (final)
  claim: attempts n → n + 1 (conditional update; loser skips)
  send ok  → sent (error = NULL)
  send err → failed (error = Resend message); retried next run while attempts < 5
```

## AdminSettings

Singleton row, id `admin-settings-singleton` (`ADMIN_SETTINGS_ID`), created
on first read with `alertEmail = NULL`, `alertEmailEnabled = true`.

| Field | Rules |
|---|---|
| `alertEmail` | trimmed; `""` → `NULL`; else `validateEmail` and ≤ 254 chars, else 400 «Некорректный email» |
| `alertEmailEnabled` | boolean, required in `PUT` |

## BackupSettings.enabledChangedAt

Set to `now` by `updateBackupSettings` only when the incoming `enabled`
differs from the stored one. Used by `backup_disabled` (`> 1 h`) and
`backup_overdue` (`max(lastBackupAt, enabledChangedAt)`).

## File: `$BACKUP_DIR/.offsite-storage.json` (written by the prod wrapper)

```json
{"reportedAt":"2026-10-29T10:17:03Z","freeBytes":1610612736,"totalBytes":250059350016,"backupsBytes":209715200,"capBytes":21474836480,"capPruned":false}
```

Parsed by `parseOffsiteStorage` (`services/backup/backup.helpers.ts`):
`reportedAt` must match `ISO_UTC_SECONDS_REGEX` and round-trip; byte fields
non-negative safe integers; `totalBytes > 0`; `capPruned` boolean; any
deviation → `null` (= no report, checks `offsite_disk_space_low` /
`offsite_cap_reached` return `null` and keep the current state).

## File: `$OFFSITE_DEST/.cap-pruned` (home only)

`0` or `1`, rewritten by `pull-backups.sh` in runs that pulled a copy or
deleted by cap; read in other runs. Missing → `0`.

## Backend types (`backend/src/types/adminAlerts.ts`)

```ts
export type AdminAlertSeverityDto = "critical" | "warning";
export type AdminAlertEmailStatusDto =
  | "pending" | "sent" | "failed" | "skipped_no_email" | "skipped_disabled";
export type AdminAlertEmailDto = {
  status: AdminAlertEmailStatusDto;
  attempts: number;
  lastError: string | null;
};
export type AdminAlertDto = {
  id: string;
  type: string;
  severity: AdminAlertSeverityDto;
  title: string;
  description: string;
  openedAt: string;
  lastSeenAt: string;
  occurrences: number;
  resolvedAt: string | null;
  readAt: string | null;
  openEmail: AdminAlertEmailDto;
  resolveEmail: AdminAlertEmailDto | null;
};
export type AdminAlertsResponse = { alerts: AdminAlertDto[] };
export type AdminSettingsDto = { alertEmail: string | null; alertEmailEnabled: boolean };
export type UpdateAdminSettingsDto = { alertEmail?: unknown; alertEmailEnabled?: unknown };
export type TestEmailResponse = { sentTo: string };
```

They mirror `frontend/src/shared/api/admin.types.ts` (`AdminAlert`,
`AdminAlertEmail`, `AdminSettings`, already in place), plus
`AdminAlertsResponse` and `TestEmailResponse` added on the frontend.

`BackupOffsiteStatus` (backend `types/backup.ts`, frontend `admin.types.ts`)
gains `syncStaleHours: number` and `restoreCheckStaleHours: number`.

## Service-level types (`services/adminAlerts/adminAlerts.types.ts`)

```ts
export type AlertCheckResult =
  | { active: true; description: string; eventKey?: string }
  | { active: false }
  | null; // no data: keep the current state

export type AlertCheckContext = { now: Date; activeAlert: AdminAlert | null };

export type AdminAlertDefinition = {
  type: string;
  severity: AdminAlertSeverity;
  title: string;
  check?: (context: AlertCheckContext) => Promise<AlertCheckResult>;
};
```
