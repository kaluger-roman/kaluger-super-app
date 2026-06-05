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

## Токен-бюджет для /qa-roam

`/qa-roam --budget <N|N%>` снимает потолок «2–3 роута»: агент крутит всё новые сценарии и после
каждого сверяется с расходом токенов за текущее 5-часовое окно подписки.

```bash
node scripts/qa-token-usage.mjs --since <RUN_START_ISO> --budget 20%
```

- Считает usage по транскриптам `~/.claude/projects/**/*.jsonl` (все проекты — лимит общий на
  аккаунт). Печатает JSON со `spent` / `budgetTokens` / `percentOfBudgetUsed` / `verdict`
  (`continue` | `stop`).
- `--budget` — абсолют (`200000`, `150k`) или процент (`20%`). Для процента нужен знаменатель —
  **авто-детект**: максимальный 5-часовой блок в истории. Переопределить: `--limit <N>` или
  `QA_SESSION_TOKEN_LIMIT`.
- Метрика по умолчанию `billed` = input+output+cache_creation (без дешёвых cache-read, иначе число
  раздувается в 100+ раз). Альтернативы: `--metric total` (всё), `--metric io`.
- Полный скан истории кешируется (TTL 6 ч в `~/.claude/.qa-token-usage-limit.json`); «потрачено с
  старта» считается только по свежим файлам — проверка после каждого сценария дешёвая.

Оговорка: usage **текущего** хода ещё не на диске → лёгкая недооценка, поэтому стоп срабатывает с
небольшим запасом (не перерасходует).

## Escape hatch и edge-cases

- `--host` у `/qa-roam` и `/manual-qa` → старое поведение: целиться в уже запущенные dev-серверы на
  `localhost:3000`, Docker не поднимать.
- `/manual-qa http://...` → прямой base URL (стек не поднимать).
- Realtime (WebSocket) работает: фронт берёт same-origin `ws://<host>/ws`, nginx проксирует на
  backend (см. `frontend/src/shared/config/index.ts` → `resolveWsUrl`).
- Фоновые cron-задачи бэкенда (бэкап и т.п.) внутри контейнера безвредны для QA — если что-то
  падает по расписанию, это лог, не блокер.
