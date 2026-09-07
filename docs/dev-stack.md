# Per-branch dev-окружение (`scripts/dev-stack.sh`)

Параллельная разработка нескольких веток (worktree) без драки за порты 3000/3001 и без общей БД
с разными схемами миграций. Каждая ветка получает **стабильный слот портов** и **свой Docker
Postgres** с двумя базами; dev-серверы при этом остаются **на хосте** (быстрый HMR, symlink
`node_modules` из основного репозитория продолжает работать).

```
ветка A (idx 1): front http://localhost:3010 → api http://localhost:3011 → postgres :15433 (tutor_app + tutor_app_test)
ветка B (idx 2): front http://localhost:3020 → api http://localhost:3021 → postgres :15434 (tutor_app + tutor_app_test)
main:            классические 3000/3001 и личный локальный Postgres — скрипт для main отказывается работать
```

Слоты: `idx` на ветку из реестра `<git-common-dir>/dev-stack-ports.json` (общий для всех worktree,
не в репозитории); порты `web = 3000 + idx*10`, `api = 3001 + idx*10`, `db = 15432 + idx`. Слот
переживает перезапуски — на ветку всегда можно зайти снаружи по её постоянному порту. `down`
освобождает слот.

## Команды

```bash
bash scripts/dev-stack.sh up               # postgres ветки + prisma migrate deploy в обе БД → JSON с портами
bash scripts/dev-stack.sh ports            # JSON с портами ветки (аллоцирует слот, если новый)
bash scripts/dev-stack.sh run-backend      # backend dev-сервер (nodemon) на api-порту ветки, dev-БД
bash scripts/dev-stack.sh run-frontend     # CRA dev-сервер на web-порту ветки, REACT_APP_API_URL → api ветки
bash scripts/dev-stack.sh run-backend-e2e  # backend с NODE_ENV=test E2E=1 на ТЕСТОВОЙ БД ветки (для e2e)
bash scripts/dev-stack.sh test-backend --testPathPatterns=students   # jest против тестовой БД ветки
bash scripts/dev-stack.sh e2e -- e2e/students/create-student.spec.ts # playwright на портах ветки
bash scripts/dev-stack.sh migrate          # накатить миграции в обе БД ветки
bash scripts/dev-stack.sh psql "select email from users limit 5;"    # SQL в dev-БД (--test — в тестовую)
bash scripts/dev-stack.sh status           # docker compose ps
bash scripts/dev-stack.sh down             # снести postgres ветки + том, освободить слот
bash scripts/dev-stack.sh down-all         # снести все dev-* стеки
```

`up` печатает JSON:

```json
{"project":"dev-031-max-messenger","branch":"031-max-messenger","webUrl":"http://localhost:3010","apiUrl":"http://localhost:3011","dbPort":15433,"databaseUrl":"postgresql://dev:dev@localhost:15433/tutor_app?schema=public","testDatabaseUrl":"postgresql://dev:dev@localhost:15433/tutor_app_test?schema=public"}
```

## Как это работает

- **Личный `backend/.env` не трогается.** Обёртки `run-*`/`test-backend`/`e2e` экспортируют
  `PORT`, `DATABASE_URL`, `FRONTEND_URL` (CORS), `REACT_APP_API_URL` поверх — dotenv-загрузчики
  (Prisma, jest `setup.ts`) не перекрывают уже выставленные переменные окружения, поэтому секреты
  (JWT, Resend, VAPID) продолжают браться из твоего `.env`, а порты/БД — из слота ветки.
- **WebSocket в dev** выводится из `REACT_APP_API_URL` (`resolveWsUrl` в
  `frontend/src/shared/config/index.ts`) — realtime ветки ходит в бэк своей же ветки.
- **Playwright** читает `E2E_BASE_URL`/`PORT` (`frontend/playwright.config.ts`), API-хелперы e2e —
  `E2E_API_URL`; всё выставляет команда `e2e`. Бэк для e2e поднимай отдельно: `run-backend-e2e`.
- **Тестовая БД** (`tutor_app_test`) создаётся при первом старте тома
  (`scripts/dev-db-init.sql`) и мигрируется вместе с dev-БД на `up`/`migrate`.
- Docker Desktop должен быть запущен. Контейнер лёгкий (только postgres) — несколько веток
  параллельно живут спокойно.

## Связь с QA-стеком

`scripts/qa-stack.sh` (см. `docs/qa-docker.md`) — другое: это **прод-сборка** (nginx + собранный
backend) для прогонов `/qa-roam` и `/manual-qa`, с эфемерным портом и одноразовой БД. dev-stack —
для разработки: hot reload, jest, e2e, скриншоты макетов в `/auto-feature`. Общий у них паттерн —
неймспейсинг по ветке (`qa-<branch>` / `dev-<branch>`).
