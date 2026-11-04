# Локальная разработка на macOS

Все команды выполняются в локальном checkout на Mac. SSH, sshfs, удалённые
`node_modules` и dev-сервер на `home` больше не нужны.

## Инструменты

- Git, Node.js из `.nvmrc` и npm (у каждого пакета свой `package-lock.json`).
- Docker Desktop с Compose v2: запустить `open -a Docker`, проверить `docker info`.
- Для GitHub — `gh` с локальной авторизацией (`gh auth status`). Для редактирования
  проекта GitHub CLI не обязателен.
- Для функций бэкапа — клиент PostgreSQL 16: `brew install libpq@16`.
  Обёртки находят его в `/opt/homebrew/opt/libpq@16/bin` (Apple Silicon) или
  `/usr/local/opt/libpq@16/bin` (Intel). Можно задать `DEV_STACK_PG_BIN` явно.
  Сам PostgreSQL на Mac устанавливать/запускать не нужно: сервер работает в Docker.

```bash
nvm install
nvm use
bash scripts/setup-local.sh
```

Setup устанавливает зависимости через `npm ci` в корне, `backend`, `frontend`,
`landing`, генерирует Prisma-клиент и создаёт `backend/.env`, только если его ещё нет.
Локальные JWT/VAPID ключи генерируются заново; `.env` не выводится и не коммитится.
Существующий файл не переписывается. В каждом worktree свои зависимости и ключи.
Повторный setup переустанавливает зависимости по lockfiles; данные БД не затрагивает.

Email по умолчанию без реального API-ключа: отправка писем не работает, коды для
локальных сценариев читаются из dev-БД. Реальные Resend/TURN ключи добавляйте в
локальный `.env`, только когда нужны эти интеграции. Ключи и бэкапы с прода не копируются.

## Worktree и Codex

Можно работать в основном checkout или выбрать Worktree в приложении Codex.
Managed worktree может быть в detached HEAD — скрипты это поддерживают. Не создавайте
вложенный worktree внутри уже выделенного чата. Параллельным задачам — разные worktree.

Для ручного worktree (из основного checkout):

```bash
git fetch origin main
git worktree add .worktrees/my-task -b codex/my-task --no-track origin/main
cd .worktrees/my-task
bash scripts/setup-local.sh
```

Уже созданная ветка миграции содержит новые скрипты; пока она не в `main`, создавайте
worktree от неё или от её проверенного коммита. `origin/main` выше — стандартный
путь после мержа миграции.

В Local environments в настройках Codex можно указать setup
`bash scripts/setup-local.sh`. Полезные действия: `dev-stack.sh up`,
`dev-stack.sh run-backend`, `dev-stack.sh run-frontend`, `npm run check`.
В `.codex/hooks.json` хранится проверка changelog перед PR. После просмотра подтвердите hook через `/hooks`; доверие не включается коммитом. Состояние оркестраторов в `.codex/workflow/` ignored. См. [workflow](codex-workflow.md).
Docker не запускается автоматически при создании каждого чата.

Перед удалением worktree остановите его серверы и `bash scripts/dev-stack.sh down`.
Если БД больше не нужна — `bash scripts/dev-stack.sh reset --yes`, затем удаление
worktree. Данные Docker не удаляются вместе с каталогом worktree автоматически.

## Проверки

```bash
npm run check
npm run test:scripts
npm run check -- --full
```

`check` охватывает только затронутые frontend/backend. Для landing отдельно:
`npm --prefix landing run lint`, `npm --prefix landing test`,
`npm --prefix landing run build`. Для E2E сначала установить Chromium:
`cd frontend && npx playwright install chromium`.

Linux-only тесты offsite-backup пропускаются на Mac и остаются в Linux CI.
Не переносите cron/flock/GNU-скрипты бэкапов на Mac в рамках настройки dev.

При ошибке sandbox/доступа к Docker или `.git` нужен доступ к соответствующей
локальной операции, а не переключение на `home` и не отключение защиты глобально.
