# Contract: admin API additions

All under `/api/admin`, all behind `authenticateAdmin` (401 «Токен доступа
обязателен» without a token, 403 «Недействительный или истекший токен» with a
bad one — the existing middleware). Routes are added to
`backend/src/routes/admin.ts`.

## GET /alerts

200:

```json
{
  "alerts": [
    {
      "id": "clx…",
      "type": "backup_failed",
      "severity": "critical",
      "title": "Бэкап не создан",
      "description": "Ошибка: Ошибка pg_dump: connection refused",
      "openedAt": "2026-10-29T08:00:01.000Z",
      "lastSeenAt": "2026-10-29T09:00:02.000Z",
      "occurrences": 2,
      "resolvedAt": null,
      "readAt": null,
      "openEmail": { "status": "sent", "attempts": 1, "lastError": null },
      "resolveEmail": null
    }
  ]
}
```

- Contains every active alert and the alerts resolved in the last 90 days.
- Order: active first; inside active `critical` before `warning`, then
  `openedAt` desc; resolved by `resolvedAt` desc.
- `resolveEmail` is `null` exactly while the alert is active.
- 500 «Ошибка получения алертов».

## POST /alerts/:id/read

- Sets `readAt = now` if the alert is active and unread; already read or
  resolved → no change.
- 200: `{ "alerts": [...] }` (same as GET).
- 404 «Алерт не найден»; 500 «Ошибка обновления алерта».

## POST /alerts/read-all

- Sets `readAt = now` on every active unread alert.
- 200: `{ "alerts": [...] }`; 500 «Ошибка обновления алертов».

## GET /settings

200: `{ "alertEmail": "admin@example.com" | null, "alertEmailEnabled": true }`;
500 «Ошибка получения настроек».

## PUT /settings

Body (both fields required):

```json
{ "alertEmail": "admin@example.com", "alertEmailEnabled": true }
```

- `alertEmail`: string or `null`; trimmed; `""` and `null` store `NULL`.
- 200: saved settings (same shape as GET).
- 400 «Некорректный email» — not a string/null, fails `validateEmail`, or
  longer than 254 chars; nothing is saved.
- 400 «Некорректное значение переключателя рассылки» — `alertEmailEnabled`
  missing or not a boolean.
- 500 «Ошибка сохранения настроек».

## POST /settings/test-email

- Sends «Тестовое письмо от админки» to the saved address (also when the
  switch is off).
- 200: `{ "sentTo": "admin@example.com" }`.
- 400 «Сначала сохраните адрес для уведомлений» — no saved address.
- 429 «Тестовое письмо можно отправлять не чаще раза в минуту» — previous
  attempt less than 60 s ago (counted for failed attempts too).
- 502 «Не удалось отправить письмо: <Resend message>».
- 500 «Ошибка отправки тестового письма».

## GET /backup/settings (changed)

`offsite` gains two fields (FR-011):

```json
"offsite": {
  "lastSyncAt": "2026-10-29T09:17:02Z",
  "restoreCheck": { "…": "…" },
  "syncStaleHours": 24,
  "restoreCheckStaleHours": 48
}
```

## PUT /backup/settings (changed behaviour only)

Changing `enabled` updates `BackupSettings.enabledChangedAt`; response shape
unchanged.

## Test-only routes (`NODE_ENV=test`, `/api/__test__`)

- `POST /admin/run-alert-checks`, body `{ "types"?: string[] }` → runs every
  registered check (`ALERT_DEFINITIONS`), or only the listed types when `types`
  is given (e2e passes the deterministic ones: disk checks read the host), 200
  `{ "ok": true }`.
- `DELETE /admin/alerts` → deletes all alerts and resets the settings row,
  200 `{ "ok": true }`.
