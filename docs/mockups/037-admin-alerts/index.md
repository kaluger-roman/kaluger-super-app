# Mockups: 037-admin-alerts

Screenshots are local-only (`docs/**/screenshots/` is gitignored). Captured with headless Playwright on the dev machine against the branch frontend dev server (web :3060, `scripts/dev-stack.sh run-frontend`) without a backend: `/api/admin/overview` and `/api/admin/backup/settings` were answered by Playwright route interception, the admin token was put into `localStorage` by hand. Browser timezone UTC. Desktop 1440x900, mobile 375x812, full-page.

Admin page (`/admin`) gets two new tabs: «Алерты» (index 2) and «Настройки» (index 3), plus a banner on «Обзор».

- Tab «Алерты» has a red counter of active unread alerts in its label. Toolbar: toggle «Активные / Все» and «Отметить все прочитанными» (disabled when nothing is unread). Each card shows the severity chip («Критично» red / «Предупреждение» orange) with a matching left stripe, title, description, «Началось», «Последний раз» (with «повторялось N раз» when `occurrences > 1`), «Закрыт» for resolved ones and one email line per letter: «Письмо о проблеме …», and for resolved alerts also «Письмо о решении …» (отправлено / ожидает отправки / ошибка отправки with the Resend text and attempt «N из 5» in red / не отправлено: адрес не указан / не отправлено: рассылка выключена). Unread active alerts have a «Прочитано» button. Read active alerts and resolved alerts are muted: grey background, grey stripe, outlined severity chip. «Все» lists active alerts first, then «Закрытые за последние 90 дней» with a «Решено» chip on each.
- Tab «Настройки»: «Email для уведомлений» with a helper text saying an empty address means no letters, switch «Отправлять алерты на почту», «Сохранить», «Отправить тестовое письмо» (disabled while no address is saved) and the hint «Тестовое письмо уходит на сохранённый адрес, не чаще раза в минуту». An invalid address shows «Некорректный email» under the field.
- Tab «Обзор»: banner «Есть активные проблемы: N» with «Открыть алерты» (switches to the «Алерты» tab through the existing `tabChanged`). It is red when at least one active alert is critical, orange when only warnings are active, and hidden when nothing is active. Following FR-033, N is the number of active alerts (4 in the mock), while the tab counter shows only unread active ones (2). Say so at the checkpoint if both should show the same number.
- With four tabs the tab bar no longer fits at 375 px: it scrolls horizontally with arrow buttons, the selected tab is scrolled into view. On phones the admin card padding drops from 24 to 16 px.

Alerts and settings are hardcoded mocks (`frontend/src/pages/AdminPage/mocks/`), and every usage point is marked `TODO(auto-feature)`. The «Активные / Все» toggle uses local `useState` and the email field and switch are uncontrolled. All buttons do nothing. The mock state comes from the URL, mockup-only: `?mock=filled` (default: 4 active alerts, 2 unread, plus 3 resolved, address filled), `?mock=empty` (no active alerts, only history, empty address), `?mock=invalid` (same alerts, address `admin@example` with the validation error). The new API types (`AdminAlert`, `AdminAlertEmail`, `AdminSettings`, …) are already in `shared/api/admin.types.ts`.

| File | What it shows |
|---|---|
| `screenshots/01-desktop-alerts-active.png` | «Алерты», filter «Активные»: two unread critical alerts (pg_dump error repeated 2 times with the letter sent; low disk on the home machine with the letter failing, «Попытка 3 из 5») and two read, muted ones (restore check failed: «таблица lessons пуста»; backup storage stale with the letter not sent because no address was set) |
| `screenshots/01-mobile-alerts-active.png` | The same on a phone: tabs scroll, the toolbar wraps, the long pg_dump text wraps inside the card |
| `screenshots/02-desktop-alerts-all.png` | Filter «Все»: active alerts, then «Закрытые за последние 90 дней»: «Автобэкапы выключены» (both letters skipped, sending turned off), «Мало места на диске сервера» (both letters sent), «Бэкап не создан» (closing letter failed, «Попыток: 5 из 5, отправка остановлена») |
| `screenshots/02-mobile-alerts-all.png` | The same on a phone |
| `screenshots/03-desktop-alerts-empty.png` | No active alerts: empty state «Всё в порядке, активных алертов нет», no counter on the tab, «Отметить все прочитанными» disabled |
| `screenshots/03-mobile-alerts-empty.png` | The same on a phone |
| `screenshots/04-desktop-settings-filled.png` | «Настройки» with a saved address, sending on |
| `screenshots/04-mobile-settings-filled.png` | The same on a phone: the buttons stack |
| `screenshots/05-desktop-settings-empty.png` | Empty address: placeholder, helper text about no letters, «Отправить тестовое письмо» disabled |
| `screenshots/05-mobile-settings-empty.png` | The same on a phone |
| `screenshots/06-desktop-settings-invalid.png` | Invalid address `admin@example`: red field and «Некорректный email» |
| `screenshots/06-mobile-settings-invalid.png` | The same on a phone |
| `screenshots/07-desktop-overview-banner.png` | «Обзор» with the red banner «Есть активные проблемы: 4» and «Открыть алерты» above the stats cards |
| `screenshots/07-mobile-overview-banner.png` | The same on a phone: «Открыть алерты» moves under the message; the tab counter is scrolled out of view here, the banner covers that |
| `screenshots/08-desktop-overview-no-alerts.png` | «Обзор» with no active alerts: no banner, as before the feature |
| `screenshots/08-mobile-overview-no-alerts.png` | The same on a phone |
