# Manual QA Report — fix-video-calls-followups — 2026-10-23 (run 1)

**Feature:** PR #89 — follow-up fixes for 030-webrtc-video-calls (FRONTEND_URL check, offline-callee dialing flash, iOS video pause, multi-tab after restart)
**Spec:** нет отдельной спеки; план построен по diff `1dffde7..6ad0197` (коммиты 8615537, 6aa1b6f, 7e9cd75, 3615eb6, 6ad0197) и по задаче оркестратора
**Base URL:** http://localhost:32784 (изолированный QA-стек `qa-fix-video-calls-followups`, собран `scripts/qa-stack.sh up` из чистого снимка `git archive 6ad0197`)
**Прогон выполнен:** 2026-10-23 08:30–09:35 UTC
**Автофикс:** включён (ничего не исправлено, см. «Автофикс»)
**Объём:** только сегодняшние изменения, без полной регрессии

## Резюме

Проверены четыре области PR #89: адреса в ссылке-приглашении и письме сброса пароля плюс проверка `FRONTEND_URL` при деплое, звонок собеседнику не в сети и задержанный показ экрана вызова, автовозобновление видео в звонке (Chromium и WebKit в окне iPhone), а также поведение нескольких вкладок после рестарта сервера во время звонка. На HEAD 3615eb6 QA-стек не поднимался: бэкенд отказывался стартовать с `FRONTEND_URL=http://localhost`. Это исправлено в 6ad0197 (проверка осталась только в деплое), и весь прогон шёл на 6ad0197. Блокеров нет. Одна новая проблема: пока экран вызова скрыт (0,5 с или до `call_ringing`), кнопку «Позвонить» можно нажать ещё раз, и уходит второй вызов.

## Оценка готовности

- **Статус:** 🟡 требует доработки (одна Medium-находка)
- **Соответствие:** 11 из 13 сценариев пройдено, 2 с замечанием
- **Найдено проблем:** Critical 0 / High 1 (уже исправлена в 6ad0197) / Medium 1 / Low 2
- **Топ-3 риска перед мержем:**
  1. Второй вызов при повторном нажатии «Позвонить» в скрытом окне (#2)
  2. Ссылки из QA-стека не открываются: `FRONTEND_URL=http://localhost` без порта (#3)
  3. При RTT больше 0,5 с экран вызова и гудок по-прежнему показываются собеседнику не в сети примерно на 1 с (#4, так задумано)

## Покрытие сценариев

| # | Сценарий | Приоритет | Результат | Заметки |
|---|---|---|---|---|
| S1.1 | Ссылка-приглашение начинается с `FRONTEND_URL` стека и открывает регистрацию | P1 | ✅ pass | `http://localhost:32784/student-invite/<token>` открывает «Регистрация в личном кабинете … Анна Репетиторова пригласил вас» |
| S1.2 | Ссылка в письме сброса пароля начинается с `FRONTEND_URL` и открывает форму | P1 | ✅ pass | Письмо перехвачено заглушкой Resend в контейнере: `http://localhost:32784/reset-password?token=…` открывает «Установка нового пароля» |
| S1.3 | `checkEnv` в production отклоняет `http://localhost:3000`, `http://` и локальные хосты, пропускает публичный https | P1 | ✅ pass | Подготовленные `.env` через `node --env-file`, Node 20.20.2 (home) и Node 22.23.3 (версия на проде, запуск в scratchpad); см. таблицу ниже |
| S1.4 | `checkEnv` завершается с кодом 1, если `NODE_ENV` не production | P1 | ✅ pass | `development`, пустой `NODE_ENV` и `Production` дают exit 1 с понятным сообщением |
| S1.5 | QA-стек (production-сборка, `http://localhost`) стартует | P1 | ⚠️ warn | На 3615eb6 не стартовал (#1), на 6ad0197 стартует; ссылки без порта (#3) |
| S2.1 | Ученик звонит репетитору не в сети: нет экрана вызова и гудка, тост, «Без ответа» / «Пропущен» | P1 | ✅ pass | MutationObserver: 0 появлений `[aria-label="Отменить вызов"]`, 0 `new AudioContext`, 0 `OscillatorNode.start`; тост «Репетитор сейчас не в сети» |
| S2.2 | Репетитор звонит ученику не в сети: то же | P1 | ✅ pass | Тост «Ученик сейчас не в сети»; история репетитора «Без ответа» (серый чип), ученика «Пропущен» (цветной чип) |
| S2.3 | Обычный звонок: экран вызова появляется, как только идёт вызов | P1 | ✅ pass | `call_ringing` через ~245 мс после `call_invite`, экран через 323 мс после клика; гудок стартует; отмена работает, у репетитора тост «Вызов отменён» |
| S2.4 | WebSocket задержан на ~700 мс: экран через ~0,5 с, звонок работает | P1 | ✅ pass | Экран через 620 мс после клика (раньше `call_ringing`, по таймеру), репетитор принял, видео в обе стороны 640×480, завершение корректное |
| S2.5 | Отмена в скрытом окне / сразу после показа на медленной сети | P1 | ⚠️ warn | Отмена через 0,55 с (до `call_ringing`) срабатывает: `call_cancel` уходит, когда приходит `callId`, у репетитора модалка закрывается. Повторное нажатие «Позвонить» в скрытом окне даёт второй вызов (#2) |
| S3.1 | Видео в звонке: `pause()`, скрытие/возврат вкладки, тап возобновляют, PiP нет (Chromium) | P1 | ✅ pass | Обе плитки, обе стороны: `pause()` возобновляется сам за <300 мс; при отказе `play()` в фоне возобновляется на `visibilitychange`; тап возобновляет; `disablePictureInPicture=true`, `controls=false` |
| S3.2 | То же в WebKit в окне iPhone 390×844, локальная и удалённая плитки, скриншот без нативной кнопки | P1 | ✅ pass | Playwright WebKit 26.0 (ученик) ↔ Chromium (репетитор): все проверки как в S3.1, тап через `touchscreen.tap` попадает в `<video>`. Скриншоты 20–22 |
| S4.1 | Рестарт бэкенда во время звонка: ждущие вкладки не забирают соединение (регресс run 11 #1), репетитор и ученик | P1 | ✅ pass | Держатели (`tut`, `stu`) переподключились с `resume=1`; ждущие (`tA2`, `tAd`, `s1b`) без переподключения, сразу баннер «Приложение открыто…» с активной кнопкой, пустого баннера нет; «Использовать здесь» в `tA2` забирает соединение, держатель получает 4000 |

Проверка `checkEnv` (`node --env-file=<file> dist/scripts/checkEnv.js`, сборка 6ad0197):

| `.env` | Результат |
|---|---|
| `NODE_ENV=production`, `FRONTEND_URL="http://localhost:3000"` | exit 1: `FRONTEND_URL must use https on the server (got "http://localhost:3000"). Links in emails and student invitations would not open.` |
| production, `http://tutor.kaluger.ru` | exit 1, `must use https` |
| production, `https://localhost`, `https://127.0.0.1`, `https://[::1]:3000`, `https://LOCALHOST` | exit 1, `points to the local machine` (последние три проверены на 6aa1b6f, логика `findPublicUrlProblem` в 6ad0197 та же) |
| production, `tutor.kaluger.ru` | exit 1, `is not an absolute URL` |
| production, `https://tutor.kaluger.ru` (также со слешем на конце и inline-комментариями `# …`) | exit 0, `Environment OK` |
| production, без `FRONTEND_URL` / без JWT-секретов | exit 1, `Missing required environment variables: …` |
| `NODE_ENV=development` / нет `NODE_ENV` / `NODE_ENV=Production` | exit 1, `NODE_ENV must be "production" on the server (got "…")` |
| файла `.env` нет | exit 9, `node: …/nope.env: not found` (деплой с `set -e` остановится) |
| в окружении shell `NODE_ENV=production`, в файле `development` | exit 0: переменная окружения важнее файла (штатное поведение `--env-file`) |

На 3615eb6 дополнительно проверен запуск собранного `dist/index.js`: с `http://localhost:3000` и `http://` в production он отказывался стартовать, с `https://tutor.example.ru` стартовал (`/health` 200, CORS `Access-Control-Allow-Origin: https://tutor.example.ru`). В 6ad0197 проверка при старте убрана, и QA-стек с `NODE_ENV=production` и `FRONTEND_URL=http://localhost:32784` стартует.

## Артефакты прогона

- Стек `qa-fix-video-calls-followups` (порт 32784) собран из `git archive 6ad0197`, распакованного в `/tmp/mqa-fvcf/src` на home (временный git-репозиторий с веткой `fix-video-calls-followups`, чтобы имя проекта совпало). Из worktree его собрать нельзя: там идут незакоммиченные правки фронтенда, на них `npm run build` в образе web падает. Env-файл стека: `/tmp/mqa-fvcf/src/.qa/qa-fix-video-calls-followups.env`, в нём `FRONTEND_URL` вручную заменён на `http://localhost:32784`, бэкенд пересоздан. Стек оставлен поднятым; снести: `cd /tmp/mqa-fvcf/src && bash scripts/qa-stack.sh down`.
- Старый стек `qa-030-webrtc-video-calls` остановлен (`down -v`).
- Сущности (Prisma-скрипт `/tmp/mqa-fvcf/seed.js` в контейнере, домен `@mqa.local`): репетитор `tutor-a@mqa.local` («Анна Репетиторова», `QaTutor!2026`), ученики «Иван Звонков» (`student1@mqa.local`), «Пётр Второй» (`student2@mqa.local`), пароль `StrongPass1`, «Без Кабинета» без кабинета (для него выпущено приглашение).
- Драйвер: `/tmp/mqa-fvcf/driver.cjs` на home (на основе `/tmp/mqa030-driver11.cjs`, добавлены счётчики `AudioContext`, MutationObserver для `[aria-label="Отменить вызов"]` и подключение к WebKit), перезапуск `/tmp/mqa-fvcf/restart.sh`, вызов `/tmp/mqa-fvcf/q.sh <file.js>`.
- WebKit: на home нет системных библиотек для WebKit, sudo нет, `docker pull mcr.microsoft.com/playwright` дважды не уложился в таймаут. Поэтому в контейнере `mqa-wk` (`ubuntu:22.04`, `--network host`) запущен `playwright install-deps webkit` и `playwright run-server --port 39042` (Playwright 1.57.0, браузер webkit-2227 из `~/.cache/ms-playwright`); контейнер оставлен запущенным. Камеры в headless WebKit нет (`OverconstrainedError`), поэтому `MediaDevices.prototype.getUserMedia` подменён на canvas `captureStream` и осциллятор.
- Задержка WebSocket ~700 мс в обе стороны: `context.routeWebSocket` в драйвере.
- Бэкенд перезапускался: один раз `docker restart` (S4.1) и при пересоздании ради `FRONTEND_URL`.
- Скриншоты: `docs/manual-qa-reports/2026-10-23-fix-video-calls-followups-run1/screenshots/` (только локально, не коммитить).

---

## Находки

### 1. QA-стек на 3615eb6 не поднимается: бэкенд отказывается стартовать с `FRONTEND_URL=http://localhost`

- **Категория:** 🐛 Bug
- **Severity:** High
- **Сценарий:** S1.5
- **Файл/место:** `backend/src/utils/validateEnv.ts` (`validateRequiredEnv` на 6aa1b6f), `docker-compose.qa.yml` (`NODE_ENV: production`), `scripts/qa-stack.sh` (`FRONTEND_URL=http://localhost`)
- **Однозначность исправления:** нет (выбор между проверкой только при деплое, другим `NODE_ENV` для QA и обходом через флаг); исправлено автором в 6ad0197

#### Шаги
1. На 3615eb6 `bash scripts/qa-stack.sh up`.

#### Ожидание
Стек поднимается, `up` печатает JSON с `url`.

#### Реальность
`dependency failed to start: container qa-fix-video-calls-followups-backend-1 exited (1)`, в логе контейнера: `Error: FRONTEND_URL must use https in production (got "http://localhost"). … Refusing to start.` Перестали работать `/manual-qa` и `/qa-roam`.

#### Статус
В 6ad0197 проверка при старте убрана, `checkEnv` запускается в деплое до миграций. Перепроверено: `qa-stack.sh up` на 6ad0197 проходит, бэкенд с `NODE_ENV=production` и `http://localhost:32784` здоров.

---

### 2. Повторное нажатие «Позвонить», пока экран вызова скрыт, отправляет второй вызов

- **Категория:** 🐛 Bug
- **Severity:** Medium
- **Сценарий:** S2.5
- **Файл/место:** `frontend/src/pages/studentCabinet/StudentCabinetLayout.model.ts` (`tutorCallRequested` → `callModel.callStarted` без проверки `$callPhase`), `frontend/src/features/videoCall/model/callSignals.model.ts` (`callStarted` → `sendInviteFx` без защиты), `frontend/src/features/videoCall/model/callScreen.model.ts` (скрытое окно)
- **Однозначность исправления:** да (не начинать вызов, если `$callPhase !== "idle"`), но эти файлы сейчас правит координатор («call start guard»), поэтому автофикс пропущен

#### Шаги
1. Репетитор онлайн. Ученик на `/student/cabinet/schedule`, WebSocket задержан на 700 мс (на обычной сети окно ~250 мс до `call_ringing`).
2. Нажать «Позвонить», через 200 мс нажать «Позвонить» ещё раз (кнопка видна и активна: экран вызова ещё не показан).

#### Ожидание
Второе нажатие ничего не делает (или кнопка недоступна), как и раньше, когда экран вызова сразу закрывал страницу.

#### Реальность
Уходят два `call_invite`. Сервер отменяет первый вызов: у репетитора мелькает модалка входящего, тост «Вызов отменён», затем сразу второй входящий. У обоих в истории лишняя запись «Отменён» (две записи CANCELED с разницей 264 мс в `call_records`). Ученик видит один экран вызова (второго вызова).

```
stu >> call_invite i=33a3c   << call_ringing c=1ad1f
stu >> call_invite i=ef31f   << call_ringing c=e281d
tut << call_incoming c=1ad1f  << call_canceled c=1ad1f  << call_incoming c=e281d
```

#### Скриншоты
![Ученик](./2026-10-23-fix-video-calls-followups-run1/screenshots/10-double-start-student.png)
![Репетитор](./2026-10-23-fix-video-calls-followups-run1/screenshots/10-double-start-tutor.png)

#### Предлагаемое исправление
Пропускать `callStarted`, когда `$callPhase` не `idle` (одна защита в `call.model` или `callSignals.model` закрывает и кабинет ученика, и карточку ученика у репетитора). Регрессионный тест в `callSignals`/`call.model`: два `callStarted` подряд дают один `sendInviteFx`.

---

### 3. В QA-стеке ссылки из приглашения и письма не открываются: `FRONTEND_URL=http://localhost` без порта

- **Категория:** 💡 Improvement
- **Severity:** Low
- **Сценарий:** S1.1, S1.2, S1.5
- **Файл/место:** `scripts/qa-stack.sh:72` (`FRONTEND_URL=http://localhost`), `docker-compose.qa.yml:33`
- **Однозначность исправления:** нет (порт web эфемерный и известен только после `up`: нужен фиксированный порт или пересоздание бэкенда после `up`)

#### Шаги
1. `bash scripts/qa-stack.sh up` → `url: http://localhost:32784`.
2. Выпустить приглашение ученику, запросить сброс пароля.

#### Ожидание
Ссылки ведут на стек (`http://localhost:32784/...`).

#### Реальность
`inviteUrl: http://localhost/student-invite/-2DnCxAu…` и `http://localhost/reset-password?token=…`: порт 80, стек там не слушает. Пока ссылки падали обратно на `http://localhost:3000`, было так же; теперь адрес берётся только из `getFrontendUrl`, так что QA-прогоны ссылок без ручной правки env не проходят. Для этого прогона `FRONTEND_URL` заменён на `http://localhost:32784`, бэкенд пересоздан.

#### Предлагаемое исправление
В `qa-stack.sh up` после определения порта записать `FRONTEND_URL=http://localhost:<port>` в env-файл и пересоздать backend (`up -d backend`), либо публиковать web на порту, выбранном скриптом заранее.

---

### 4. При RTT больше 0,5 с экран вызова и гудок всё ещё мелькают, если собеседник не в сети

- **Категория:** ⚠️ UX issue
- **Severity:** Low
- **Сценарий:** S2.4
- **Файл/место:** `frontend/src/features/videoCall/model/callScreen.model.ts` (`OUTGOING_REVEAL_DELAY_MS = 500`)
- **Однозначность исправления:** нет (так задумано: на медленной сети экран должен появиться, не дожидаясь сервера)

#### Шаги
1. Репетитор с WebSocket, задержанным на 700 мс, звонит ученику не в сети.

#### Ожидание (по CHANGELOG)
«экран показывается, когда сервер подтвердил вызов, или через 0,5 с»: на медленной сети короткий показ ожидаем.

#### Реальность
Экран «Вызываем…» и гудок видны ~1,3 с, затем тост «Ученик сейчас не в сети». На обычной сети (RTT ~40 мс) экрана и гудка нет совсем. Фиксируется как известное ограничение, а не дефект.

#### Скриншоты
![Тост после показа экрана на медленной сети](./2026-10-23-fix-video-calls-followups-run1/screenshots/23-tutor-slow-ws-offline-student.png)

---

## Наблюдения вне объёма (не находки этого PR)

- Звонок, оборванный рестартом бэкенда (S4.1, ~08:58 UTC), не попал в историю ни у одной из сторон: в `call_records` его нет. Состояние звонка живёт в памяти; это было и до PR.
- `node dist/index.js` после SIGTERM пишет «Process terminated», но не завершается (держат таймеры cron), остановил только `kill -9`. pm2 после `kill_timeout` всё равно убивает процесс; это было и до PR.
- В WebKit нет свойства `HTMLVideoElement.disablePictureInPicture` (атрибут ставится, свойство `undefined`). Кнопки PiP в звонке нет, потому что нет `controls`. Linux-сборка WebKit не рисует iOS-кнопку `start-playback`, поэтому скриншоты 20–22 подтверждают только отсутствие наложений в WebKit, а не на настоящем iOS. CSS-правило `::-webkit-media-controls*` в `VideoTile.styled.ts` на месте.
- После `rsync --delete` новый `dist` уже лежит на сервере, когда `checkEnv` останавливает деплой. Работающий pm2-процесс не перезапускается, но при следующем падении или перезагрузке поднимется новый код без миграций. С неудачным `prisma migrate deploy` было бы то же самое.

## Автофикс

**Исправлено:** 0 находок
**Изменённые файлы:** нет (`git diff` в worktree содержит только параллельные правки координатора во фронтенде)
**Добавленные тесты:** нет

### Не исправлено автофиксом
- #1 — исправлено автором в 6ad0197, перепроверено
- #2 — исправление однозначное, но затрагивает файлы, которые сейчас правит координатор (`callScreen.model`, защита старта вызова): только в отчёт
- #3 — однозначности нет (эфемерный порт QA-стека), нужен выбор способа
- #4 — так задумано, решение продукта
