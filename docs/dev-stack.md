# Dev-стек на Mac

`bash scripts/dev-stack.sh` запускается из любого checkout проекта. PostgreSQL 16
работает в Docker Desktop; backend/frontend — на Mac с hot reload. Нативные Node.js
зависимости установлены отдельно в каждом checkout через `scripts/setup-local.sh`.

## Изоляция

Имя проекта: `dev-<checkout>-<hash абсолютного пути>`. Идентификатор не зависит от
имени ветки: `main`, несколько detached worktree Codex и ветки с похожими именами
не делят контейнеры. При переименовании ветки в том же checkout БД сохраняется;
новый путь checkout создаёт новое окружение.

Слот портов хранится в `<git-common-dir>/local-stack-ports.json`, общем для worktree
одного клона. Выделение слота блокируется атомарно, поэтому параллельные запуски не
получают одинаковый слот. Порты: web `3000 + slot*10`, API `3001 + slot*10`,
Postgres `15432 + slot`. Первый checkout обычно получает 3010/3011/15433.
Реестр не удаляйте при работающих стеках. Отдельные клоны имеют отдельные реестры:
для параллельной работы используйте worktree одного клона, а не несколько clone.

### Переход со старого реестра

Если в общем Git-каталоге остался непустой `dev-stack-ports.json`, новые команды
останавливаются до обращения к Docker, миграциям и тестам. Старый allocator не
учитывает `local-stack-ports.json`, поэтому одновременная работа двух версий может
назначить разным БД один порт. Уже выделенный новый слот не обходит эту проверку.

На этом же компьютере остановите старые dev-серверы и все соответствующие
`dev-<ветка>` Docker-проекты через прежний checkout/версию скрипта. Старый `down`
удалял том БД: если данные нужны, остановите проект через Compose без `-v`.
Только после освобождения старых портов архивируйте прежний реестр вне общего
Git-каталога или удалите его и повторите новую команду. Не запускайте прежние
allocator-скрипты одновременно с новыми. Автоматической остановки/удаления старых
стеков и переноса данных нет. Пустой `{}` допускается; повреждённый реестр требует
такой же проверки и ручного завершения перехода.

Для свежего клона на Mac этих действий не требуется. К удалённому `home` этот
локальный переход не относится.

DB-порт опубликован только на `127.0.0.1`, dev-серверы тоже слушают loopback.
Для доступа с телефона/другой машины потребуется отдельная настройка, включая
secure context для камеры и push. SSH-туннелей и внешних адресов в базовой схеме нет.

## Команды

```bash
bash scripts/dev-stack.sh up            # Postgres + миграции обеих БД → JSON с URL
bash scripts/dev-stack.sh ports         # стабильные URL/порты текущего checkout
bash scripts/dev-stack.sh run-backend   # API с локальным .env и dev-БД
bash scripts/dev-stack.sh run-frontend  # CRA/HMR, API и WebSocket текущего checkout
bash scripts/dev-stack.sh seed          # демо-данные dev-БД; печатает доступы
bash scripts/dev-stack.sh status
bash scripts/dev-stack.sh migrate       # применить committed migrations в обе БД
bash scripts/dev-stack.sh psql 'select email from users limit 5;'
bash scripts/dev-stack.sh psql --test 'select count(*) from users;'
bash scripts/dev-stack.sh exec-backend npx prisma migrate dev --name my_change
bash scripts/dev-stack.sh exec-backend npx prisma studio
bash scripts/dev-stack.sh down          # остановить контейнер; СОХРАНИТЬ данные/слот
bash scripts/dev-stack.sh reset --yes   # удалить обе БД только этого checkout и слот
```

`down` не останавливает процессы Node в других терминалах — завершите их Ctrl-C.
`reset --yes` необратимо удаляет локальные данные; не нужен для обычного рестарта.
Глобальной команды `down-all` нет: каждая задача управляет своим checkout.
Новый слот после reset может иметь другие порты, поэтому перезапустите серверы.

## Env и базы

`backend/.env` хранит локальные JWT, VAPID и необязательные ключи интеграций.
Setup не переписывает существующий `.env`. Backend сам `.env` не загружает;
обёртки используют `dotenv-cli` и задают сверху PORT, HOST, FRONTEND_URL и DATABASE_URL.
Значение DATABASE_URL из сгенерированного `.env` — намеренно нерабочий fallback:
используйте wrapper, чтобы команда Prisma не попала в общую/чужую БД.

- `tutor_app` — разработка и demo seed.
- `tutor_app_test` — Jest/E2E, может очищаться тестами.
- `up`/`migrate` применяют миграции в обе БД; `test-backend` сам стартует контейнер,
  если он не отвечает, и применяет миграции тестовой базы.
- `TEST_DATABASE_URL` в wrapper имеет приоритет над `backend/.env.test`.
- Prisma-клиент сверяется со схемой перед backend-командами. Каждый checkout
  владеет своим `node_modules`, поэтому генерация не меняет соседнюю ветку.
- Dev admin после setup: `admin@dev.local` / `DevAdmin!2026` — только локальный стенд.

## Jest и Playwright

```bash
bash scripts/dev-stack.sh test-backend --testPathPatterns=students
# В отдельном терминале вместо обычного backend:
bash scripts/dev-stack.sh run-backend-e2e
# В другом терминале:
bash scripts/dev-stack.sh e2e e2e/students/create-student.spec.ts
```

Dev и E2E backend используют один API-порт: не запускайте их одновременно в одном
checkout. Playwright запускает frontend сам либо использует уже запущенный на порту
checkout. Wrapper выставляет `E2E_BASE_URL`, `E2E_API_URL`, `REACT_APP_API_URL`, `PORT`.
E2E backend использует только тестовую БД, тестовые JWT/VAPID и admin
`admin@e2e.local` / `E2eAdmin!2026`, не загружая личный `.env`.

Проверки бэкапов вызывают `pg_dump` с Mac. Нужен PostgreSQL client 16, например
`brew install libpq@16`; wrapper выбирает Homebrew-клиент или `DEV_STACK_PG_BIN`.
Для других тестов этот клиент не нужен. В CI/Linux поддержан `/usr/lib/postgresql/16/bin`.

`npm run check` по умолчанию использует этот же test-wrapper, включая `main`.
`--backend-tests npm` — явное исключение для отдельно настроенной тестовой БД/CI;
оно не мигрирует внешнюю БД автоматически.

## Диагностика

- Docker недоступен → `open -a Docker`, дождаться `docker info`, повторить `up`.
- Порт занят → проверить процесс через `lsof -nP -iTCP:<port> -sTCP:LISTEN`;
  не завершать чужие процессы автоматически. Остановить свой старый сервер.
- Ошибка миграции → проверить логи и `prisma migrate status` через `exec-backend`;
  не запускать reset наугад.
- Ошибка lock реестра → убедиться, что другой setup уже завершился; только после
  этого удалить оставшийся `.lock`-каталог. Повреждённый реестр вызывает ошибку,
  а не молчаливое переиспользование занятых портов.
- Production-build QA использует другой [стек](qa-docker.md), `qa-<checkout>-<hash>`.
