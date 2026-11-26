# Production на home

Восстановление после потери VPS выполняется отдельно от разработки на Mac.
Публичные адреса: [приложение](https://tutor.kaluger.ru) и
[лендинг](https://teacher.kaluger.ru). Приватный доступ через LAN/Tailscale сохранён.

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
- Хостовый Caddy: `.production/edge/`, Compose `super-app-production-edge`.
  Директории `caddy/{app,global,sites}` содержат локальные настройки. Админский
  сокет доступен только внутри контейнера. Сборки лендинга находятся в `landing/`.
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
`PROD_PROXY_IP`; значения IP и порта записываются без кавычек. Web публикуется
на loopback и двух указанных приватных IP.
Backend не публикуется; data network с PostgreSQL — `internal`.

У Huawei WiFi AX2 WAN `85.172.107.143`, зарезервированный LAN-IP home `192.168.3.89`.
Публичные A-записи приложения и лендинга указывают на WAN. Роутер передаёт TCP
80 и 443 на эти же порты home, где Caddy отвечает по имени из запроса, оформляет
и обновляет HTTPS-сертификаты и передаёт приложение на `127.0.0.1:8080`.

Приватный HTTPS доступен через Tailscale Serve. Прямые HTTP-порты оставлены
для диагностики внутри LAN и tailnet:

- LAN: `http://192.168.3.89:8080` (адрес выдаёт DHCP, после смены обновите compose.env).
- Tailscale: `http://100.67.75.106:8080`.
- Приватный HTTPS: `https://roman-kaluger.tail76e67c.ts.net` после включения Serve.

Для входа, камеры, микрофона и service worker используйте HTTPS.

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

### Деплой из GitHub

После публикации workflow в `main` запуск Deploy на GitHub собирает backend, web
и лендинг. После успешной сборки GitHub начинает задачу Deploy на home в окружении
`production`. Опрос каждые пять минут проверяет этот запуск через API GitHub и
сверяет его SHA с текущей вершиной `main`. Входящий SSH и VPS-секреты для этого
не нужны.

Файлы `scripts/production/{poll-deploy,deploy-release,github-deploy}.sh` устанавливаются в
`.production/deploy/`. Лог опроса и выкладки — `.production/deploy/deploy.log`.
Релизы хранятся в `.production/deploy/releases`; `active` указывает на release с
используемой конфигурацией и `.release.env` с тегами образов. При ручном обслуживании
развёрнутого релиза добавляйте `--env-file <release>/.release.env` после `compose.env`
и передавайте файл Compose из активного релиза. Теги образов содержат SHA релиза.
Публичная метка относится к приложению и лендингу. Caddy, TURN и установленные
cron-скрипты обновляются отдельной эксплуатационной командой.

Перед переключением скрипт проверяет новый env, сохраняет `pg_dump` и оставляет
контейнер и volume БД на месте. Старые web/backend останавливаются заранее только
при новых миграциях. Статус GitHub обновляется, когда проверены публичная ревизия,
health и лендинг. Чтобы повторить неудавшуюся выкладку, запустите Deploy для `main`
в Actions заново. Ошибку схемы разбирайте по указанному логу. Автоматический
откат сервисов допускается, когда состояние миграций не изменилось. Файл
`.production/deploy/cutover` показывает незавершённое переключение; в этом
состоянии опрос ожидает допущенный релиз для продолжения выкладки. Если GitHub
уже завершил прерванную попытку, запустите Deploy для `main` вручную.

Ручной запуск из исходного каталога оставлен для первичного восстановления.
Перед применением проверенной версии сделайте бэкап и сохраните `.production/`:

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
До импорта создайте роль приложения `roman-kaluger` с парольной конфигурацией из
восстановленного `backend.env`. SQL-дамп содержит владельцев объектов и использует
эту роль. Сверьте агрегаты до запуска приложения.

### Внешнее резервирование

`prepare-offsite.sh` на home берёт свежий `pg_dump` и соединяет его с `backend.env`,
`db.env` и `compose.env` в tar-поток через `age`. В Caddy попадает только шифротекст.
Файл выдаётся по HTTPS с учётной записью `backup`. После загрузки GitHub
скачивает артефакт обратно, сравнивает байты и отправляет его SHA-256 через
отдельную учётную запись `backup_receipt`. Пароли хранятся в секретах закрытого
`kaluger-super-app-backups`, хеши в `caddy/app/offsite.caddy`.

Три раза в сутки GitHub сохраняет артефакт `production.age` на 90 дней. У home
есть только открытый ключ age, а закрытый `identity.age` и проверенный бинарник
age хранятся на Mac в `~/.local/share/kaluger-super-app-backups/`. При восстановлении скачайте
артефакт на доверенный компьютер и проверьте его ключом перед извлечением:

```bash
backup_home=~/.local/share/kaluger-super-app-backups
"$backup_home/bin/age" -d -i "$backup_home/identity.age" production.age | tar -tf -
```

Подтверждение GitHub связывает шифротекст с SHA-256 исходного дампа и обновляет
дату внешней копии в админке. Один раз в сутки home сверяет тот же дамп и
восстанавливает его во временный PostgreSQL без сети и с хранилищем в памяти.
`check-offsite.sh` пишет результат в `.offsite-restore-check.json`.
Приложение использует его для алертов об ошибке и просрочке проверки.
Закрытый ключ age для восстановления внешней копии остаётся на Mac.
В приложении включены дампы с интервалом около семи часов. Для внешней копии
нужен дамп моложе суток; при его отсутствии workflow завершится ошибкой.

### TURN

TURN использует `turn.tutor.kaluger.ru` с A-записью на WAN home и отдельный
сертификат из Caddy. Конфигурация в `.production/turn/`, Compose
`super-app-production-turn`. Роутер передаёт на home TCP/UDP 3478, TCP 5349 и
UDP 49160–49175. Этот диапазон рассчитан на небольшой параллельный трафик.
`refresh-turn-cert.sh` копирует только сертификат и ключ TURN и перезапускает
контейнер при смене сертификата. `TURN_URL` в `backend.env` задаёт все три транспорта,
`TURN_SECRET` совпадает с `static-auth-secret`. До внешней проверки реле эти
переменные не добавляются в backend.

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

## Эксплуатационные зависимости

- Docker Compose 2.30+ для `env_file.format: raw`, Docker Buildx, Git, Python 3 и
  GNU Bash утилиты на home. Mac остаётся машиной разработки.
- Работа почты зависит от действующего Resend-ключа. Push после восстановления
  подписывается новой VAPID-парой.
- Ранее использованные VPS-процедуры сохранены в `turn-relay.md` и `offsite-backups.md`
  как история исходного развёртывания.
