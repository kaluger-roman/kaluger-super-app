# Contract: alert types, texts and letters

## Definitions (`services/backupAlerts`)

Titles must match the mockups (`frontend/src/pages/AdminPage/mocks/`, deleted
during implementation). Sizes: `formatGigabytes(bytes)` → `1,8 ГБ`
(GiB, one decimal, comma). Percent: integer.

| Type | Severity | Title | Description (example) | eventKey |
|---|---|---|---|---|
| `backup_failed` | critical | Бэкап не создан | `<error.message>` without a prefix, secrets redacted (≤ 1000 chars) | attempt time ISO |
| `backup_overdue` | critical | Бэкап давно не создавался | `Последний бэкап: 27.10.2026 08:00 (МСК), при интервале 6 ч.` / `Бэкапов ещё не было, автобэкапы включены 27.10.2026 08:00 (МСК).` | — |
| `backup_disabled` | warning | Автобэкапы выключены | `Автоматические бэкапы выключены в настройках больше часа.` | — |
| `backup_size_drop` | warning | Бэкап резко уменьшился | `Последний бэкап <name>: 0,1 МБ, медиана 5 предыдущих: 0,5 МБ. Возможна потеря данных или битый дамп.` | newest file name |
| `backup_storage_limit` | warning | Превышен лимит хранения бэкапов | `Бэкапы младше 30 дней занимают больше лимита <N> МБ, удалять нечего. Увеличьте лимит.` | — |
| `disk_space_low` | critical | Мало места на диске сервера | `На сервере свободно 1,8 ГБ из 77,0 ГБ (2%), бэкапы занимают 9,6 ГБ.` | — |
| `offsite_disk_space_low` | critical | Мало места на диске резервного хранилища | `На домашней машине свободно 1,5 ГБ из 234,0 ГБ (1%), копии занимают 19,8 ГБ. Отчёт от 29.10.2026 12:17 (МСК).` | — |
| `offsite_cap_reached` | warning | Резервное хранилище упёрлось в лимит | `Копии занимают 19,9 ГБ при лимите 20,0 ГБ: удаляются копии моложе 90 дней.` | — |
| `offsite_stale` | warning | Резервное хранилище давно не обновлялось | `Последнее копирование: 26.10.2026 09:17 (МСК), больше 24 часов назад.` / `Копирование ещё не выполнялось.` | — |
| `restore_check_failed` | critical | Проверка восстановления завершилась ошибкой | `Последняя проверка восстановления на домашней машине: <RESTORE_CHECK_ERROR_MESSAGES[reason]>.` | `checkedAt` |
| `restore_check_stale` | warning | Проверка восстановления давно не выполнялась | `Последняя проверка: 26.10.2026 09:20 (МСК), больше 48 часов назад.` / `Проверка восстановления ещё не выполнялась.` | — |

Thresholds (`backupAlerts.constants.ts`): `DISK_LOW_FREE_BYTES = 2 GiB`,
`DISK_LOW_FREE_RATIO = 0.10`, `DISK_OK_FREE_BYTES = 3 GiB`,
`DISK_OK_FREE_RATIO = 0.15`, `BACKUP_OVERDUE_GRACE_HOURS = 2`,
`BACKUP_DISABLED_GRACE_MS = 1 h`, `SIZE_DROP_RATIO = 0.5`,
`SIZE_DROP_SAMPLE = 5`. Offsite thresholds come from
`services/backup/backup.constants.ts` (`OFFSITE_STALE_HOURS`,
`RESTORE_CHECK_STALE_HOURS`).

## Generic constants (`adminAlerts.constants.ts`)

`ADMIN_SETTINGS_ID = "admin-settings-singleton"`, `MAX_EMAIL_ATTEMPTS = 5`,
`ALERT_RETENTION_DAYS = 90`, `ALERT_DESCRIPTION_MAX_LENGTH = 1000`,
`EMAIL_ERROR_MAX_LENGTH = 500`, `TEST_EMAIL_INTERVAL_MS = 60_000`,
`ALERT_EMAIL_TIME_ZONE = "Europe/Moscow"`.

## Letters

Sent by `sendAdminEmail({ to, subject, html })` (`services/email.ts`, from
`EMAIL_FROM`). In `NODE_ENV=test` recorded in `lib/testMailbox.ts` with
`html`.

| Letter | Subject |
|---|---|
| open, critical | `[Критично] <title>` |
| open, warning | `[Предупреждение] <title>` |
| resolve | `[Решено] <title>` |
| test | `Тестовое письмо от админки` |

Body (open / resolve), inline HTML like the existing letters, every
interpolated value HTML-escaped:

- heading: title; line «Уровень: Критично | Предупреждение» (resolve: «Проблема решена»);
- description (`white-space: pre-wrap`);
- «Началось: dd.mm.yyyy hh:mm (МСК)»; resolve adds «Закрыто: … (МСК)»;
- open with `occurrences > 1` is not possible (letters go only at open);
- button/link «Открыть админку» → `${getFrontendUrl()}/admin`.

Test letter: «Это тестовое письмо: уведомления об алертах будут приходить на
этот адрес.» + the same link.
