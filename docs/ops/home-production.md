# Production на home

Восстановление после потери VPS выполняется отдельно от разработки на Mac.
Текущий этап — доступ только внутри LAN/Tailscale; публичный DNS не переключается.

## Размещение и секреты

- Сервер: бывший `home`, SSH `roman-kaluger@100.67.75.106`.
- Отдельный каталог: `~/super-app-production`, Docker-проект `super-app-production`.
- Конфигурация: `docker-compose.production.yml`, `infra/production/`,
  `frontend/nginx.production.conf`.
- Приватные файлы: `.production/{compose,backend,db}.env`, права `600`, каталог `700`.
  Они не входят в Git, Docker build context или PR. `backend.env`/`db.env` используют
  Compose `format: raw`: значения записаны без кавычек, `$` в bcrypt не интерполируется.
- База: PostgreSQL 16, named volume `super-app-production_db-data`. Порт не опубликован.
  Роль приложения `roman-kaluger` не имеет superuser/createdb/createrole.
- Новые бэкапы: `.production/backups/`; оригинальный recovery-дамп:
  `.production/recovery/`. Исходное хранилище `~/prod-backups` сохраняется.
- JWT-секреты production отделены от dev. Email/admin-конфигурация перенесена из
  сохранённого `.env` на home без вывода значений в логи. Сохранённая VAPID-пара
  не прошла криптографическую проверку: для нового адреса создана новая согласованная
  пара, push нужно включить заново. Пароли пользователей восстанавливаются из БД.
  Старые JWT-сессии после смены ключей требуют входа заново.

Разработка и тесты выполняются только на Mac с отдельными тестовыми БД. Не запускайте
QA stack, seed, Prisma reset или автотесты против этого production-хранилища.

## Точка восстановления

Выбран `backup-2026-11-01T22-00-00-043Z.sql.gz` — **02.11.2026, 01:00 МСК**.
SHA-256: `bd37ad0599cc4b5478253a0c41ada7a06cc44b9482630a536f784b87cc15f327`.
`gzip -t` и SQL-восстановление одной транзакцией завершены успешно. Сразу после
восстановления: 4 users, 31 students, 1494 lessons, 44 записи Prisma migrations.
Данные после времени дампа отсутствуют. Метаданные и приватный restore log находятся
в `.production/restore-metadata.json` и `.production/restore.log` на сервере.

## Сеть

`compose.env` задаёт `PROD_LAN_IP`, `PROD_TAILSCALE_IP`, `PROD_PORT` (8080) и
`PROD_PROXY_IP`. Web публикуется только на loopback и двух указанных приватных IP.
Backend не публикуется; data network с PostgreSQL — `internal`.

Текущие HTTP-адреса после запуска web:

- LAN: `http://192.168.3.89:8080` (адрес выдаёт DHCP, после смены обновите compose.env).
- Tailscale: `http://100.67.75.106:8080`.
- Приватный HTTPS: `https://roman-kaluger.tail76e67c.ts.net` после включения Serve.

Для камеры/микрофона и service worker нужен HTTPS. HTTP по IP годится для базового
доступа, но не обеспечивает эти возможности браузера.

При проверке на Mac другой VPN направлял `192.168.3.89` в `utun105`, вызывая
`ERR_EMPTY_RESPONSE`. Прямой Wi-Fi-запрос через `en0` получил HTTP 200. Если LAN URL
не открывается, проверьте локальный VPN/разрешение доступа к LAN; используйте приватный
HTTPS через Tailscale. Серверные порты при этом исправны.

На машине оставался exit node потерянного VPS. Для восстановления внешнего доступа
и делегирования управления Tailscale владельцу машины:

```bash
sudo tailscale set --exit-node= --operator=roman-kaluger
```

После разрешения Serve владельцем tailnet:

```bash
tailscale serve --bg --https=443 http://127.0.0.1:8080
tailscale serve status
```

Funnel **не включать**. Адрес `*.ts.net` доступен только участникам tailnet.
`FRONTEND_URL` в backend.env должен совпадать с каноническим HTTPS URL: он используется
в письмах и приглашениях. nginx доверяет forwarded IP только локальному Docker gateway
(`PROD_PROXY_IP`); наружу в backend передаётся один проверенный IP, включая WebSocket.
Узнать gateway после создания app network:

```bash
docker network inspect super-app-production_app --format '{{(index .IPAM.Config 0).Gateway}}'
```

## Запуск и обслуживание

На сервере определите функцию для команд из production-каталога:

```bash
cd ~/super-app-production
dc() { docker compose --env-file .production/compose.env -f docker-compose.production.yml "$@"; }
dc config -q
dc ps
dc logs --tail 50 backend
```

`config -q` проверяет структуру без вывода секретов. Не публикуйте вывод полного
`docker compose config`, `docker inspect` или env-файлов. Логи контейнеров ограничены
3 файлами по 10 МБ. Все сервисы имеют `restart: unless-stopped`; Docker должен
автоматически запускаться на машине.

Для обновления передайте проверенную версию исходников с Mac в этот отдельный каталог,
сохраняя `.production/`. Не выполняйте `rsync --delete` для всего каталога. Сначала
сделайте бэкап, затем:

```bash
dc build
dc run --rm --no-deps backend node dist/scripts/checkEnv.js
dc stop web backend
dc run --rm --no-deps backend node node_modules/prisma/build/index.js migrate deploy
dc up -d --wait --wait-timeout 120
curl -fsS http://127.0.0.1:8080/health
```

Применение миграций — отдельная явная команда. Startup их не запускает. Для отката
проверьте совместимость схемы; обратное восстановление требует отдельной новой БД
из сохранённого дампа. Никогда не используйте `down -v`: это удалит production-данные.

Одноразовый операционный бэкап без изменения данных приложения:

```bash
umask 077
BACKUP_FILE=".production/backups/backup-$(date -u +%Y-%m-%dT%H-%M-%S)Z.sql.gz"
set -o pipefail
dc exec -T db pg_dump -U postgres -d tutor_app | gzip > "$BACKUP_FILE.tmp" &&
  gzip -t "$BACKUP_FILE.tmp" && mv "$BACKUP_FILE.tmp" "$BACKUP_FILE"
```

При ненулевом статусе остановите обновление; итоговый файл не создаётся после
неуспешного `pg_dump`. Неполный `.tmp` не считается резервной копией.

При восстановлении сначала проверяйте архив, копируйте его в `.production/recovery`,
восстанавливайте только в пустую отдельную БД с `psql -v ON_ERROR_STOP=1 --single-transaction`.
Сохраняйте владельцев объектов и сверяйте агрегаты до запуска приложения.

## Выполненная проверка — 04.11.2026

- Production build frontend/backend завершён; deploy env валиден, все 44 миграции
  применены, pending/failed migrations отсутствуют. PostgreSQL и `pg_dump` — 16.15.
- Три сервиса healthy до и после перезапуска; агрегаты остались 4 / 31 / 1494.
- Проверены HTTP 200 по LAN (прямой Wi-Fi), Tailscale IP и HTTPS; в браузере HTTPS
  открывает страницу входа. Админский read-only API вернул агрегаты с валидным
  короткоживущим серверным токеном; запрос без токена получил 401.
- `/ws` и `/ws/student` через HTTPS дают upgrade 101 и закрывают соединение без
  токена кодом 1008. Реальные пользовательские сессии для проверки не использовались.
- Поддельный `X-Forwarded-For` не заменяет реальный IP клиента через LAN/Serve.
  Проверены закрытые DB/backend-порты и отсутствие Funnel.
- Новый `backup-2026-11-04T20-18-27-647Z.sql.gz` создан через сервис приложения и
  прошёл `gzip -t`. Recovery-архив сохранён отдельно.
- По явному разрешению владельца остановлены 20 старых dev/QA-контейнеров без удаления
  томов, отключены две cron-задачи потерянного VPS. Список контейнеров и исходный
  crontab сохранены приватно в `.production/`.
- Scripts-проверки на Mac: 195 passed, 145 Linux-only skipped. Полные app suites
  локально не запускались: код приложения не менялся. Реальная production-БД не
  использовалась для тестов; проверки выше — операционная проверка восстановления.

Отправка писем, доставка push и реальные видеозвонки в этом восстановлении не проверялись.

## Ограничения текущего этапа

- Требуется Docker Compose с поддержкой `env_file.format: raw` (2.30+).
- Старый `.github/workflows/deploy.yml` относится к VPS и не развёртывает этот стек.
  Обновление home выполняется явно с Mac; старые `VPS_*` secrets не переключаются.
- До появления внешнего IP публичные `tutor.kaluger.ru`/`teacher.kaluger.ru` не обслуживаются
  этим стеком. Landing и публичный TURN пока не переносятся; звонки работают через STUN
  при доступном прямом соединении. Работа почты зависит от сохранённого Resend-ключа.
- Старые offsite cron-задачи для утраченного VPS не являются резервированием нового
  production. Нужен отдельный независимый offsite-получатель; локальный диск home и
  recovery-копия на нём не защищают от потери этой машины.
- Переход в публичный режим требует отдельной настройки DNS, HTTPS, внешних портов,
  TURN, deploy pipeline и независимого offsite-хранилища. Статический IP Mac не нужен.
