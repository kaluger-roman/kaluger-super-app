# Изолированные QA-стеки (Docker) для /qa-roam и /manual-qa

`/qa-roam` и `/manual-qa` поднимают приложение для проверок в **отдельном Docker-стеке на ветку**,
а не в общих dev-серверах на портах 3000/3001. Это даёт две вещи:

1. **Параллельность.** Несколько `/qa-roam` / `/manual-qa` на разных ветках (worktree) идут
   одновременно — у каждого свой контейнерный Postgres и свой эфемерный порт, они не дерутся за
   3000/3001 и не затирают данные друг друга.
2. **Чистоту.** Личная локальная БД разработчика (`tutor_app` на `localhost:5432`) вообще не
   используется — стек поднимает свою свежую БД и сносит её целиком после прогона.

## Архитектура

```
Браузер Playwright (на хосте)
   │  http://localhost:<эфемерный порт>
   ▼
[web]  nginx  — отдаёт прод-сборку фронта; проксирует /api и /ws на backend:3001
[backend] node — prisma migrate deploy → node dist/index.js   (порт 3001, не опубликован)
[db]   postgres — свежая БД, не опубликована, том удаляется на `down`
```

Изоляция держится на имени compose-проекта `qa-<branch>`: контейнеры, сеть и том БД
неймспейсятся проектом. Публикуется **только** порт `web` — Docker выдаёт свободный эфемерный
порт, скрипт читает его обратно.

Файлы: `docker-compose.qa.yml`, `backend/Dockerfile.qa`, `frontend/Dockerfile.qa`,
`frontend/nginx.qa.conf`, оркестратор `scripts/qa-stack.sh`.

## Предпосылки

- **Docker Desktop запущен** (`docker info` отвечает). Если нет — `open -a Docker` и подождать.
- Первая сборка образов — ~2–4 мин (`npm ci` + прод-сборка CRA внутри). Дальше слой-кэш Docker
  переиспользуется между ветками (одинаковый `package-lock`), пересборка — секунды-десятки секунд.
- RAM ≈ 210 МБ на стек → несколько стеков спокойно живут параллельно.

## Команды `scripts/qa-stack.sh`

```bash
bash scripts/qa-stack.sh up            # собрать+поднять стек ветки, дождаться готовности → JSON c url
bash scripts/qa-stack.sh port          # {project,url} текущей ветки
bash scripts/qa-stack.sh status        # docker compose ps
bash scripts/qa-stack.sh exec-backend 'npm run db:seed'         # команда внутри backend-контейнера
bash scripts/qa-stack.sh psql "select email from users limit 5;" # SQL внутри db-контейнера
bash scripts/qa-stack.sh down          # снести стек ветки + том + env-файл
bash scripts/qa-stack.sh down-all      # снести все qa-* стеки на машине
```

`up` печатает JSON, например:
```json
{"project":"qa-028-forgot-password","branch":"028-forgot-password","url":"http://localhost:54312","adminEmail":"admin@qa.local","adminPassword":"QaAdmin!2026","envFile":".qa/qa-028-forgot-password.env"}
```
`url` — base URL для Playwright. Стек по умолчанию **остаётся поднятым** после прогона (можно
зайти руками и доглядеть); снести — `down` или флаг `--teardown` у скилла.

### Доступы и данные

- БД стека **пустая** (накатаны только миграции). Данные создаём через UI, API под залогиненным
  пользователем, `exec-backend`-вставки или `exec-backend 'npm run db:seed'` (в изолированной БД
  это безопасно, в отличие от старого запрета сидить личную БД).
- Все обращения к БД идут **внутрь контейнера** через `exec-backend`/`psql` — на хосте `npx tsx`
  смотрел бы в личную БД.
- Тестовый админ стека: `admin@qa.local` / `QaAdmin!2026`. RESEND заглушён (письма не уходят) —
  коды верификации читать прямо из БД. VAPID-ключи валидные (push-подписка работает).

## Бюджет для /qa-roam

`/qa-roam --budget <N%>` снимает потолок «2–3 роута»: агент крутит всё новые сценарии, пока прогон
не съест N% реального 5-часового окна подписки. Только проценты, абсолютных токен-бюджетов нет.

```bash
node scripts/qa-budget.mjs start --budget 20%   # на старте прогона: baseline
node scripts/qa-budget.mjs check                # после каждого сценария: verdict
```

- Источник — настоящие лимиты подписки: Claude Code передаёт статуслайну
  `rate_limits.five_hour.used_percentage` / `resets_at`, statusline-скрипт дампит stdin в
  `/tmp/statusline-debug.json` (переопределяется env `QA_STATUSLINE_DUMP` / флагом `--source`).
  **Требование:** первая строка statusline-скрипта должна писать дамп — `echo "$input" > /tmp/statusline-debug.json`.
- `start` запоминает baseline-процент и `resets_at` в `.qa/qa-budget.json` (свой на worktree);
  `check` печатает `spentPct` / `budgetPct` / `remainingPct` / `verdict` (`continue` | `stop`).
  Сброс окна посреди прогона учитывается: накопленный расход переносится, baseline обнуляется.
- Защита от мусорных данных: нет дампа / нет `rate_limits` / дамп старше 15 минут → `verdict: stop`
  с причиной в `reason` (exit-код всегда 0, вызывающий читает JSON).

Оговорка: `used_percentage` — целые проценты (бюджеты <5% грубые), и значение обновляется после
ответов API — стоп срабатывает с небольшим запасом (не перерасходует).

## Escape hatch и edge-cases

- `--host` у `/qa-roam` и `/manual-qa` → старое поведение: целиться в уже запущенные dev-серверы на
  `localhost:3000`, Docker не поднимать.
- `/manual-qa http://...` → прямой base URL (стек не поднимать).
- Realtime (WebSocket) работает: фронт берёт same-origin `ws://<host>/ws`, nginx проксирует на
  backend (см. `frontend/src/shared/config/index.ts` → `resolveWsUrl`).
- Фоновые cron-задачи бэкенда (бэкап и т.п.) внутри контейнера безвредны для QA — если что-то
  падает по расписанию, это лог, не блокер.
