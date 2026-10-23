# Mockups: 036-offsite-backups

Screenshots are local-only (`docs/**/screenshots/` is gitignored). Captured with headless Playwright on the dev machine against the branch frontend dev server (web :3060, `scripts/dev-stack.sh run-frontend`) without a backend: the admin API (`/api/admin/overview`, `/api/admin/backup/settings`) was answered by Playwright route interception, the admin token was put into `localStorage` by hand. Desktop 1440x900, mobile 375x812, full-page.

Admin page, tab «Бэкапы» (`/admin`). New elements:
- hint under the settings row: «Бэкапы младше 30 дней не удаляются независимо от лимита размера»;
- two status lines under «Последний бэкап»: «Резервное хранилище: …» and «Проверка восстановления: …». Normal state is plain secondary text like «Последний бэкап»; a warning state turns the line into `Alert severity="warning"` (the app's usual warning style);
- warning «Лимит превышен: бэкапы младше 30 дней не удаляются. Увеличьте лимит.» right under «Всего: X МБ / Y МБ» in the screenshots. After the mockup checkpoint the owner moved it under the 30-day hint (next to the settings); the implementation renders it there.

At mockup time the new fields were hardcoded mocks with a URL query switch between the states `ok`, `stale`, `never`, `checkStale` (screenshots 01–08). Both were removed in the implementation: the section now reads `backupStatusModel`, fed by `GET /api/admin/backup/settings`.

| File | What it shows |
|---|---|
| `screenshots/01-desktop-ok.png` | Всё в порядке: копия 20 минут назад, проверка 9 часов назад «успешно (14 пользователей, 93 ученика, 2431 урок)», обе строки обычным цветом; подсказка про 30 дней под настройками |
| `screenshots/02-mobile-ok.png` | То же на телефоне |
| `screenshots/03-desktop-stale-error.png` | Копия 3 дня назад: предупреждение «давно не обновлялось (больше 24 часов)»; проверка восстановления «— ошибка: таблица lessons пуста» как предупреждение |
| `screenshots/04-mobile-stale-error.png` | То же на телефоне |
| `screenshots/05-desktop-never-limit-exceeded.png` | «копирование ещё не выполнялось» и «Проверка восстановления: ещё не выполнялась» как предупреждения; объём 14.4 МБ при лимите 10 МБ и предупреждение о превышении лимита под «Всего» |
| `screenshots/06-mobile-never-limit-exceeded.png` | То же на телефоне |
| `screenshots/07-desktop-check-stale.png` | Копия свежая, последняя успешная проверка 3 дня назад: предупреждение «…, но это было больше 48 часов назад» |
| `screenshots/08-mobile-check-stale.png` | То же на телефоне |
