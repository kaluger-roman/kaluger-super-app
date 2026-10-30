# Research: 037-admin-alerts

Facts were checked against the code on branch `037-admin-alerts` (2026-10-29).
Each item: Decision / Rationale / Alternatives considered.

## R1. One active alert per type

- **Decision**: column `activeType String? @unique` on `admin_alerts`, equal to
  `type` while the alert is active and set to `NULL` on resolve. Opening is
  `findUnique({ where: { activeType } })` → update, or `create`; a `P2002` on
  `create` (a parallel check won the race) falls back to the update path.
- **Rationale**: Postgres treats NULLs as distinct in a unique index, so any
  number of resolved alerts of a type coexist while at most one is active
  (edge case "две проверки одновременно"). It is Prisma-native: no raw SQL in
  the migration and `findUnique` works on it.
- **Alternatives**: partial unique index `ON admin_alerts(type) WHERE
  "resolvedAt" IS NULL` (precedent: `20260510182545_partial_unique_pending_reminders`)
  — works, but invisible to Prisma (`findUnique` impossible, schema and DB
  differ); app-level lock — does not survive two code paths (cron + backup
  event) racing.

## R2. Registry and the generic mechanism (FR-007, US5)

- **Decision**: a type is an `AdminAlertDefinition`
  `{ type, severity, title, check? }`. `check(context)` returns
  `{ active: true, description, eventKey? }`, `{ active: false }` or `null`
  ("no data, keep the current state"). `context = { now, activeAlert }` gives
  the check its current state (needed for hysteresis). Types without `check`
  are event-only (`backup_failed`) and are raised/resolved by
  `raiseAlert(definition, { description, eventKey })` / `resolveAlert(definition)`.
  Code split, to keep imports acyclic:
  - `services/adminAlerts/` — generic core (lifecycle, email dispatch,
    settings, test email, `runAlertChecks(definitions, now)`), knows nothing
    about backups;
  - `services/backupAlerts/` — the 11 backup definitions, their checks, and
    `runBackupJobWithAlerts` / `createManualBackupWithAlerts`; imports
    `services/backup` and `services/adminAlerts`;
  - `services/alertRegistry/` — `ALERT_DEFINITIONS` (today
    `BACKUP_ALERT_DEFINITIONS`) and `runScheduledAlertChecks()` used by the cron.
  A new source = a new definitions file + one line in `alertRegistry`; no
  schema, API or frontend change (alert rows store their own severity and
  title).
- **Rationale**: `services/backup` must not import alerts (it would create a
  `backup → adminAlerts → registry → backupAlerts → backup` cycle). Wrapping
  the backup attempt in `backupAlerts` keeps `backup.ts` unaware of alerts.
- **Alternatives**: hook parameter in `runBackupJob` (adds a test-only seam,
  forbidden by backend-testing.md); event emitter (more moving parts).

## R3. What counts as an occurrence (Clarification 1)

- **Decision**: every applied `active: true` result updates `lastSeenAt` and
  `description`. `occurrences` grows by 1 only when the result carries an
  `eventKey` different from the stored `eventKey` (stored column). Event keys:
  `backup_failed` — attempt time ISO; `restore_check_failed` — the report's
  `checkedAt`; `backup_size_drop` — the newest file name. All other types
  return no key, so they stay at 1. `readAt` is never reset by a repeat.
- **Rationale**: a 15-minute state check would otherwise show «повторялось 96
  раз» per day and re-light the tab counter; the counter must reflect new
  problems, not re-confirmations.

## R4. Email lifecycle (FR-020…FR-023, Clarification 2)

- **Decision**:
  - On open: `openEmailStatus` = `skipped_no_email` (no address),
    `skipped_disabled` (switch off) or `pending`, from settings at that moment.
    It is never revisited, so alerts opened before an address existed are not
    re-sent (FR-023).
  - On resolve: open skipped → `resolveEmailStatus` = the same skipped status
    (mockup shows both lines skipped); otherwise `pending`.
  - `dispatchAlertEmails(now)` (runs at the end of every check run and right
    after a backup attempt): selects emails with status `pending` or `failed`
    and `attempts < 5`; a resolve email is eligible only when the open email
    is `sent` or `failed` with 5 attempts (order: open before resolve). Before
    each attempt it re-reads settings: no address → `skipped_no_email`, off →
    `skipped_disabled` (final). Otherwise it claims the attempt with a
    conditional `updateMany` (`where: { id, <kind>EmailAttempts: n,
    <kind>EmailStatus in (pending, failed) }`, `data: attempts n + 1`); only
    the winner sends, so cron and a backup event never send twice. Result:
    `sent` (error cleared) or `failed` with the Resend message (≤ 500 chars).
  - Retry cadence: first attempt immediately, then every 15-minute run: 5
    attempts cover ~1 h of Resend outage.
- **Rationale**: SC-003 (exactly 2 letters per episode), ordering from the edge
  cases, idempotence without an in-process lock (pm2 runs a single fork, but
  cron and a manual backup can still overlap).
- **Alternatives**: a separate `admin_alert_emails` table — more general (N
  recipients) but YAGNI for one recipient (spec Assumptions); per-email
  columns are enough and keep FR-007 (no schema change for new types).

## R5. Resend errors

- **Decision**: new `sendAdminEmail({ to, subject, html })` in
  `services/email.ts` checks the `{ data, error }` result of
  `resend.emails.send` and throws `AdminEmailSendError(error.message)` when
  `error` is set (and rethrows network exceptions as the same class). In
  `NODE_ENV=test` it records `{ to, subject, html }` in `lib/testMailbox.ts`
  (new optional `html` field) and never throws.
- **Rationale**: Resend SDK 6.x does not throw on API errors; it returns them.
  The existing user email functions ignore that — filed as issue #151, not
  fixed here (scope).
- **Testing failures**: unit tests of the dispatcher `jest.mock` the email
  module (mocking external services is allowed; Prisma stays real).

## R6. Email content (FR-021)

- **Decision**: pure builders in `adminAlerts.helpers.ts`:
  `buildAlertEmail(alert, kind, adminUrl)`, `buildTestEmail(adminUrl)`.
  Subject: `[Критично] <title>` / `[Предупреждение] <title>` / `[Решено] <title>`;
  test: `Тестовое письмо от админки`. Body: level, title, description,
  «Началось» (and «Закрыто») formatted with
  `Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow" })` plus «(МСК)»,
  link `${getFrontendUrl()}/admin`. All interpolated text is HTML-escaped
  (descriptions carry `pg_dump` stderr). Inline HTML like the other letters.
- **Alternatives**: a template engine — new dependency, not needed.

## R7. Settings and test email (FR-034…FR-036)

- **Decision**: singleton `admin_settings` (id `admin-settings-singleton`,
  upsert with `P2002` fallback like `getBackupSettings`). `PUT` takes
  `{ alertEmail: string | null, alertEmailEnabled: boolean }`, both required;
  `alertEmail` is trimmed, `""` → `null` (explicit clear, never "no change"),
  validated with `validateEmail` from `utils/auth` + max 254 chars → 400
  «Некорректный email». Test email goes to the saved address even when the
  switch is off; no address → 400 «Сначала сохраните адрес для уведомлений».
  Rate limit: module-level `lastTestEmailAt` in the service, one attempt per
  60 s regardless of outcome → `TestEmailRateLimitError` → 429 «Тестовое
  письмо можно отправлять не чаще раза в минуту»; reset helper
  `__resetTestEmailRateLimitForTests` called from `src/__tests__/setup.ts`.
  Resend failure → 502 «Не удалось отправить письмо: <message>».
- **Rationale**: `express-rate-limit` limiters are skipped in tests
  (`skip: () => isTestEnv`), so the 1/min rule would be untestable; a single
  admin makes a global limit correct.

## R8. Backup checks: data sources and rules

| Type | Source | Rule |
|---|---|---|
| `backup_failed` | event from `runBackupJobWithAlerts` / `createManualBackupWithAlerts` | raise on any thrown error (`pg_dump`, gzip, timeout, < 100 bytes), description `Ошибка: <message>` cut to 1000 chars; resolve on the next successful attempt |
| `backup_overdue` | `BackupSettings` | `enabled` and `now − max(lastBackupAt, enabledChangedAt) > (intervalHours + 2) h`; `enabled = false` → inactive |
| `backup_disabled` | `BackupSettings` | `!enabled && now − enabledChangedAt > 1 h` |
| `backup_size_drop` | `getBackupFiles()` | order by backup time (name timestamp, else mtime); need ≥ 6 files; newest size < 0.5 × median(5 previous) → active, eventKey newest name; fewer files → `null` |
| `backup_storage_limit` | `isStorageLimitExceeded(files, maxStorageMb, now)` | as the Бэкапы tab |
| `disk_space_low` | `fs.promises.statfs(getBackupDir())` (Node 20, no deps) in `backupAlerts/diskSpace.ts` | free = `bavail × bsize`, total = `blocks × bsize`; open if free < 2 GiB or < 10 %; close only if free > 3 GiB and > 15 %; otherwise keep the current state |
| `offsite_disk_space_low` | `.offsite-storage.json` | same thresholds/hysteresis on the reported numbers; no report yet → `null` |
| `offsite_cap_reached` | `.offsite-storage.json` | `capPruned = true`; no report → `null` |
| `offsite_stale` | `.offsite-last-pull` | missing/unparsable or older than 24 h |
| `restore_check_failed` | `.offsite-restore-check.json` | `status = error`; description uses the parsed Russian message (`RESTORE_CHECK_ERROR_MESSAGES`, FR-012); eventKey `checkedAt` |
| `restore_check_stale` | `.offsite-restore-check.json` | missing or `checkedAt` older than 48 h, any status (Clarification 4) |

- `BackupSettings.enabledChangedAt` (Clarification 3): `DateTime @default(now())`,
  migration backfills it from `updatedAt`; `updateBackupSettings` sets it to
  `now` only when `enabled` actually changes.
- Bytes are shown as `1,8 ГБ` (GiB, one decimal, comma) by a backend helper
  `formatGigabytes`.
- After every backup attempt `runBackupJobWithAlerts` raises/resolves
  `backup_failed`, then runs `runAlertChecks(PROD_BACKUP_DEFINITIONS)`
  (`backup_overdue`, `backup_size_drop`, `backup_storage_limit`,
  `disk_space_low`) which also dispatches emails — SC-001 is met within
  seconds. A skipped tick (not due / disabled / previous run still going)
  does nothing.

## R9. Thresholds in one place (FR-011)

- **Decision**: `OFFSITE_STALE_HOURS = 24` and `RESTORE_CHECK_STALE_HOURS = 48`
  move to `backend/src/services/backup/backup.constants.ts`. Both the alert
  checks and `GET /api/admin/backup/settings` use them; the response's
  `offsite` gains `syncStaleHours` and `restoreCheckStaleHours`, and the
  frontend `OffsiteStorageStatus` helpers take them from the store instead of
  `OffsiteStorageStatus.constants.ts` (constants deleted there).
- **Alternatives**: backend sends booleans (`isSyncStale`) — the UI still needs
  the number for «больше 24 часов», and booleans freeze at response time.

## R10. Home storage report (FR-013…FR-015)

- **Decision**: wrapper command
  `report-storage <freeBytes> <totalBytes> <backupsBytes> <capBytes> <capPruned>`;
  numbers `^[0-9]{1,15}$`, `capPruned` `^[01]$`, exactly 6 tokens, same
  length/charset/spacing checks as `report-restore-check`; writes
  `$BACKUP_DIR/.offsite-storage.json` atomically:
  `{"reportedAt":"<utc>","freeBytes":F,"totalBytes":T,"backupsBytes":B,"capBytes":C,"capPruned":true|false}`.
  Backend parses it strictly (`parseOffsiteStorage` in `backup.helpers.ts`:
  `reportedAt` in ISO seconds, non-negative safe integers, `totalBytes > 0`,
  boolean `capPruned`; anything else → `null`, treated as "no report").
- **Home side** (`pull-backups.sh`): after `apply_retention` of a run whose
  pull succeeded (also when corrupt/oversized files make the run exit 1),
  measure `df -B1 --output=avail,size "$OFFSITE_DEST"`, `backupsBytes` = the
  retention `total`, `capBytes` = `OFFSITE_MAX_BYTES`, and send via
  `ssh "${SSH_OPTS[@]}" "$OFFSITE_HOST" report-storage …`. Failure → `log
  ERROR`, exit status unchanged (FR-014).
- **`capPruned` is sticky** across pulls that bring nothing new: stored in
  `$OFFSITE_DEST/.cap-pruned`; a run that pulled ≥ 1 copy or deleted by cap
  writes `1` if it deleted by cap, else `0`; a run with no new copies and no
  cap deletion reports the stored value. Without this, at the cap (prod backs
  up every 6 h, home pulls hourly) 5 of 6 reports would say "nothing deleted"
  and `offsite_cap_reached` would open and close every 6 hours.
- **Tests**: the fixture gets a `df` stub (`DF_STUB_AVAIL`, `DF_STUB_SIZE`)
  next to the existing `ssh`/`rrsync` stubs; the `ssh` stub already routes to
  the real wrapper, so pull → report → JSON is tested end to end.

## R11. Scheduling

- **Decision**: in `backend/src/index.ts` (inside `shouldRunCrons`):
  `cron.schedule("*/15 * * * *", runScheduledAlertChecks, { timezone })`;
  the backup cron switches to `runBackupJobWithAlerts`. Each check is wrapped
  in try/catch (log + skip, FR-006); the run also deletes alerts resolved more
  than 90 days ago (FR-005) and dispatches emails. No run at startup (edge
  case "бэкенд перезапустили": the next tick recomputes, no duplicate letters
  because state is in the DB).
- Test-only route `POST /api/__test__/admin/run-alert-checks` and
  `DELETE /api/__test__/admin/alerts` (registered only in `NODE_ENV=test`) for
  e2e.

## R12. API shape

- **Decision**: `GET /api/admin/alerts` returns all active alerts plus those
  resolved within 90 days, sorted on the backend: active first, critical
  before warning, then `openedAt` desc; resolved by `resolvedAt` desc. The
  filter «Активные / Все» is client-side (tiny data set, one request). Both
  read endpoints return the fresh list, so the UI needs no extra round trip.
  `POST /alerts/:id/read` on a resolved or already read alert is a no-op;
  unknown id → 404 «Алерт не найден».

## R13. Frontend

- **Decision**:
  - `features/admin/models/adminAlerts.model.ts` (+ `.helpers.ts`,
    `.types.ts`): `$alerts`, `$alertsFilter`, derived `$activeAlerts`,
    `$resolvedAlerts`, `$activeAlertsCount`, `$unreadActiveAlertsCount`,
    `$hasActiveCriticalAlerts`; events `alertsFilterChanged`,
    `alertMarkedRead`, `allAlertsMarkedRead`; effects `getAlertsFx`,
    `markAlertReadFx`, `markAllAlertsReadFx`. Loaded on `AdminPageGate.open`,
    `loginFx.done`, every `tabChanged`, and after `createBackupFx.done` /
    `updateBackupSettingsFx.done` (a manual backup or toggling backups can
    open/close alerts). No WebSocket (spec Assumptions).
  - `features/admin/models/adminSettings.model.ts` (+ `.helpers.ts`):
    `$alertEmail` (input), `$alertEmailEnabled`, `$savedAlertEmail`,
    `$alertEmailError`; events `alertEmailChanged`, `alertEmailToggled`,
    `settingsSaved`, `testEmailRequested`; effects `getAdminSettingsFx`,
    `updateAdminSettingsFx`, `sendTestEmailFx`. Validation with
    `validateEmail` from `@shared` before the request; empty input → `null`.
    Success toasts «Настройки сохранены» / «Письмо отправлено на <адрес>»,
    errors via `extractAxiosError` (Resend text shown as is).
  - All effects join `$isBlocking` in `app/model/blocking.model.ts`.
  - Times on alert cards: `formatDateTime(value, ADMIN_TIME_ZONE)` with a new
    optional `timeZone` parameter in `shared/lib/dateFormat.helpers.ts` and
    `ADMIN_TIME_ZONE = "Europe/Moscow"` (spec Assumptions: Moscow in the admin
    and in letters).
  - `pluralize(count, forms)` moves to `shared/lib/plural.helpers.ts`
    (number + NBSP + form), replacing the copies in `AlertCard.helpers.ts`,
    `OffsiteStorageStatus.helpers.ts` and `IncomeHistory.helpers.ts`.
  - Mockup decisions kept: banner counts all active alerts, tab badge counts
    unread active ones; scrollable tab bar; `pages/AdminPage/mocks/` deleted;
    all 15 `TODO(auto-feature)` markers resolved.

## R14. Test isolation

- **Decision**: new `GLOBAL_TEST_LOCK.ADMIN_ALERTS` (35002) for every backend
  test file touching `admin_alerts` / `admin_settings`. Files that touch both
  backup settings and alerts take `BACKUP_SETTINGS` first, then
  `ADMIN_ALERTS` (fixed order, no deadlock). Backup-dir state in tmp dirs via
  `process.env.BACKUP_DIR` as existing tests do; disk space through
  `jest.mock` of `backupAlerts/diskSpace`.
