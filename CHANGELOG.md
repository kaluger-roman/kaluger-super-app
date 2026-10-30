# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-10-30

### Added
- Алерты в админке (`specs/037-admin-alerts`): новая вкладка «Алерты» со счётчиком непрочитанных активных алертов, фильтром «Активные / Все» (история закрытых за 90 дней), карточками (уровень, описание, «Началось», «Последний раз» и число повторов, «Закрыт», статус письма) и кнопками «Прочитано» / «Отметить все прочитанными»; на «Обзоре» плашка «Есть активные проблемы: N» с переходом во вкладку. Время в карточках по часовому поясу браузера, в письмах по Москве (19ff849)
- Алерты дублируются на почту: письмо при открытии (`[Критично]` / `[Предупреждение]`) и при закрытии (`[Решено]`), одно на эпизод, до 5 попыток при ошибке Resend (ошибка Resend теперь проверяется), «Решено» уходит только после письма об открытии; без адреса или с выключенной рассылкой у алерта видно «письмо не отправлено». Новая вкладка «Настройки»: «Email для уведомлений» (проверка адреса, пустое поле очищает адрес), переключатель «Отправлять алерты на почту», «Отправить тестовое письмо» (не чаще раза в минуту, отметка в `admin_settings."testEmailSentAt"`) (19ff849)
- Первые 11 проверок — бэкапы: бэкап не создан (сразу после неудачной попытки, плановой или ручной), давно не создавался, автобэкапы выключены дольше часа, резкое уменьшение размера бэкапа, превышен лимит хранения, мало места на диске сервера и на диске домашней машины (с гистерезисом: < 2 ГБ или < 10 %, закрытие при > 3 ГБ и > 15 %), резервное хранилище упёрлось в лимит 20 ГБ или давно не обновлялось, проверка восстановления упала или давно не выполнялась. Проверки идут раз в 15 минут; одна активная запись на тип (уникальный `activeType`), закрытые алерты старше 90 дней удаляются. Таблицы `admin_alerts`, `admin_settings`, колонка `backup_settings."enabledChangedAt"` (время последнего переключения автобэкапов, заполнена из `updatedAt`). Текст ошибки `pg_dump` попадает в алерт и письмо без строки подключения и пароля базы (19ff849)
- Домашняя машина после каждого копирования сообщает на прод свободное место, объём копий и удаление по лимиту: новая команда `report-storage` ограниченного ключа (строгая проверка формата) пишет `$BACKUP_DIR/.offsite-storage.json`; ошибка отчёта не делает копирование неуспешным. После деплоя нужно переустановить обёртку на проде и скрипты дома (`docs/ops/offsite-backups.md`, «After 037-admin-alerts») (19ff849)
- Общий механизм под будущие алерты: новый тип — описание (`AdminAlertDefinition`) и строка в `services/alertRegistry`, без изменений схемы, API и фронта (`docs/conventions/backend.md`, «Admin alerts»). E2E-сценарий `admin/admin-alerts.spec.ts` (19ff849)

### Changed
- Пороги предупреждений вкладки «Бэкапы» о резервном хранилище (24 ч) и проверке восстановления (48 ч) приходят с бэкенда (`offsite.syncStaleHours`, `offsite.restoreCheckStaleHours`) и совпадают с порогами алертов (19ff849)
- `/auto-feature` и `/auto-bug-fix`: manual QA идёт до 3 кругов вместо одного прогона (в `/auto-bug-fix` круги заменили разовую верификацию; первый круг повторяет шаги воспроизведения бага и смежные сценарии). Браузерный прогон делает сабагент на `sonnet` через `/manual-qa` без `--fix`, находки подтверждает и чинит основной поток с регрессионными тестами. Цикл заканчивается раньше, если новых находок нет и все перепроверки прошли, или если все сценарии пройдены в прошлых кругах и после последнего круга нечего перепроверять. `/manual-qa` получил аргумент `--context <path>` (что уже пройдено, что перепроверить, что уже известно) и поля `coverage.untested` и `recheck_results` в `findings.json` (#160)

## 2026-10-29

### Fixed
- Звонок на iPhone: если ученик остановил запись через системный индикатор микрофона или камеры, выключение и включение камеры или микрофона в звонке снова включает устройство. Раньше iOS оставляла трек заглушённым, приложение лишь переключало его, и у собеседника оставался чёрный экран; теперь заглушённый трек при включении заменяется новым, старый освобождается. Если устройство включить не удалось, приходит сообщение «Не удалось включить камеру/микрофон. Проверьте разрешения браузера». При возврате приложения из фона заглушённые треки по-прежнему не трогаются (#152)
- Пуш «Звонок принят или отклонён на другом устройстве» больше не приходит на устройство, где звонок приняли или отклонили: страница передаёт серверу push-адрес своего устройства в call_accept / call_reject, и закрывающий пуш уходит только на остальные устройства. Ответившая страница сама закрывает своё уведомление о входящем звонке
- Комиссия ученика: уроки, оплаченные одной датой (предоплата за несколько уроков), гасят комиссию в порядке проведения. Раньше при одинаковой дате оплаты порядок решал id урока, и у ученика с двумя сериями уроков пометка «в счёт комиссии» могла стоять на уроке в конце месяца, а соседние ранние уроки оставались без неё. Суммы погашения, остатка и списаний за период не меняются, меняется только то, на каких уроках стоят пометки (#136)

## 2026-10-26

### Added
- Полноэкранный режим в звонке (`specs/039-call-fullscreen`): кнопка «Во весь экран» в углу видео собеседника, двойной щелчок или двойное касание по видео. Видео собеседника (камера или демонстрация экрана) занимает всё окно приложения без шапки, отступов и своего превью; имя, таймер, метка демонстрации, «Свернуть» и кнопки звонка лежат поверх видео, видны при входе и прячутся через 3 с бездействия вместе с курсором, а курсор над панелью или фокус с клавиатуры их удерживают. Выход — «Свернуть», Esc или снова двойной щелчок / касание; режим локальный и сбрасывается с концом звонка, системный Fullscreen API не используется
- Масштаб демонстрации экрана в полноэкранном режиме: от 1× до 4× щипком, колесом мыши или щипком тачпада вокруг курсора и кнопками «+» / «−» шагом 0,5×, увеличенную картинку можно двигать пальцем или мышью, не уводя её край внутрь окна; «Исходный размер» возвращает 1×. Масштаб сбрасывается при выходе из режима, остановке демонстрации, повороте экрана и конце звонка, жесты не масштабируют страницу. E2E-сценарий в `students/video-call.spec.ts`
- Звонок по уроку: в окне урока у репетитора кнопка «Позвонить» (ученик урока с кабинетом; статус, время урока и архив не важны), у ученика карточка урока в расписании открывает окно урока (предмет, день, время, длительность, статус, репетитор) с «Позвонить». Звонок несёт урок на сервер: сервер проверяет, что урок принадлежит паре («Урок не найден»), и сохраняет ссылку на урок в записи звонка при любом исходе (`call_records."lessonId"`, FK на `lessons` с `ON DELETE SET NULL`; урок удалён во время звонка — запись сохраняется без урока)
- Подтверждение перед любым исходящим звонком: «Начать видеозвонок?» с аватаром и именем собеседника, у звонка по уроку блок «Звонок по уроку» (предмет, день, время), «Отмена» / «Позвонить»; двойное нажатие начинает один звонок, входящий вызов закрывает подтверждение. После подтверждения окно урока или карточка ученика закрывается, после отмены остаётся открытым
- Урок видно во входящем звонке, в истории звонков обеих сторон («Урок: Физика · …») и в окне урока репетитора — блок «Звонки по уроку» (направление, время, исход, длительность; новый `GET /api/calls/lessons/:lessonId`, обновляется после каждого звонка, пока окно открыто)

### Changed
- Ученик звонит только из окна урока: кнопка «Позвонить» в шапке кабинета убрана, сервер отклоняет звонок ученика без урока («Звонок возможен только по уроку»)
- Звонки ученику в архиве больше не запрещены: «Видеозвонок» в карточке ученика виден и для архивного ученика с кабинетом, сервер такой звонок пропускает
- Ответы API уроков репетитору (`GET/POST/PUT /api/lessons`) сообщают, есть ли у ученика кабинет (`student.studentUser`)

## 2026-10-23

### Fixed
- iPhone (Safari и PWA): после входа ученика экран больше не остаётся увеличенным, и звонок виден целиком вместе с кнопкой завершения. Поля ввода на телефонах были 14px, iOS приближала страницу при фокусе на логине и не возвращала масштаб; теперь на сенсорных устройствах (`@media (pointer: coarse)`) текст во всех полях MUI 16px (`MuiInputBase` в теме), на десктопе без изменений
- Звонок собеседнику не в сети: экран «Вызываем…» и гудок больше не мелькают перед сообщением «… сейчас не в сети» (экран показывается, когда сервер подтвердил вызов, или через 0,5 с; гудок разблокируется ещё в нажатии «Позвонить», а повторное нажатие, пока экран скрыт, второй вызов не шлёт); у звонящего такой звонок в истории «Без ответа», а не «Пропущен» — «Пропущен» видит только непринявшая сторона
- iOS Safari: на видео в звонке больше нет нативной кнопки паузы. Safari сам ставил видео на паузу (уход в фон, касание) и рисовал свою кнопку, а звонок застывал; теперь видео возобновляется само при паузе, возврате во вкладку и касании, нативные контролы и картинка-в-картинке скрыты; если браузер не даёт продолжить без касания, на плитке появляется «Видео на паузе. Нажмите, чтобы продолжить»
- Ссылка-приглашение в кабинет ученика и ссылка сброса пароля в письме вели на `http://localhost:3000`: на проде в `FRONTEND_URL` осталось dev-значение. Прод-конфиг исправлен (заодно `NODE_ENV=production`); деплой проверяет `.env` сервера до миграций и перезапуска (`node --env-file=.env dist/scripts/checkEnv.js`: `NODE_ENV=production`, обязательные переменные, `FRONTEND_URL` — публичный https-адрес) и падает, не трогая живое приложение. Запасные `http://localhost:3000` в коде убраны, адрес берётся из одного `getFrontendUrl`
- Вкладка, ждущая конца звонка в другой вкладке, при обрыве или рестарте сервера не переподключается сама и не отбирает соединение у вкладки со звонком; баннер не мигает пустым между «идёт звонок» и «Приложение открыто…» (8615537)

### Infrastructure
- `/bug-hunt` и `/improve-hunt` по умолчанию больше не открывают worktree, draft PR и MD-отчёт: каждая находка становится отдельным GitHub issue (метки `bug` + `bug-hunt` или `enhancement` + `improve-hunt`), перед созданием — поиск дублей по месту и по сути; к открытому issue про то же дописывается комментарий с новым, отклонённые (`NOT_PLANNED`) не заводятся заново. Прежний сценарий (отчёт в своём worktree с draft PR, исправление выбранного, круги ревью и QA) — с флагом `--fix`
- `CLAUDE.md`, раздел «Commit and Push Without Asking»: готовую и проверенную работу Claude сам коммитит и пушит в ветку задачи и ждёт CI, не спрашивая; спрашивает только про push в `main`, force-push, merge, `gh pr ready`, `/news` и деплой. `/auto-bug-fix` и `/auto-feature` делают commit + push + ожидание CI в финальной фазе, `/bug-hunt` и `/improve-hunt` — в Этапе 7 (там же `/changelog`); промежуточных коммитов между кругами ревью и QA по-прежнему нет
- `CLAUDE.md`, раздел «MANDATORY: File an Issue for Every Finding»: найденные по ходу любой задачи баги, улучшения и проблемы инфраструктуры Claude сразу оформляет GitHub issue без вопросов (сначала поиск дублей, тело на русском с местом, воспроизведением и вариантом фикса), текущую задачу ради них не расширяет и перечисляет заведённые issues в итоговом ответе
- `npm run check` (`scripts/check.mjs`) запускает tsc, ESLint, Prettier и тесты фронта и бэкенда параллельно, каждую проверку в свой лог, и печатает сводку; по умолчанию только затронутые веткой части и тесты, связанные с изменёнными файлами, `--full` — полные наборы; ESLint и Prettier с кэшем. Все проверки обеих частей идут ~2,5 мин вместо ~7,5 мин подряд
- Vitest делит тесты на два проекта: файлы с `vi.mock` (и помеченные `// @vitest-isolate`) идут изолированно, остальные делят граф модулей в воркере, поэтому MUI и модели грузятся один раз — полный прогон ~110 с вместо ~310 с. Общий проект идёт в случайном порядке файлов (сид печатается, воспроизведение через `VITEST_SEED`), `setup.ts` сбрасывает таймеры, глобальные стабы и storage после каждого теста; два теста, зависевшие от порядка файлов, исправлены. Правила — в `docs/conventions/frontend-testing.md`, раздел «Test isolation»
- Фронтовые unit-тесты больше не ходят в сеть: раньше часть из них слала реальные запросы на `localhost:3001` (в логах CI ~400 строк `ECONNREFUSED` на прогон, а с запущенным локально бэкендом запросы уходили в него). MSW в `setup.ts` отвечает на любой запрос без хендлера сетевой ошибкой и валит тест с методом и URL в сообщении; общий проект vitest заранее грузит все модели, поэтому реакции чужих моделей одинаковы при любом порядке файлов. 20 тест-файлов отвечают на свои запросы сами (`lessonListLoadHandlers()` для перезагрузки списков уроков, `server.use(...)`, моки API); правило — в `docs/conventions/frontend-testing.md` (387769c)

## 2026-10-20

### Added
- Видеозвонки между репетитором и учеником (WebRTC, peer-to-peer, `specs/030-webrtc-video-calls`). Репетитор звонит привязанному ученику из карточки ученика, ученик — репетитору из кабинета; вторая сторона видит входящий вызов с именем звонящего и принимает или отклоняет его. Медиа идёт напрямую между устройствами, сервер только ретранслирует сигналинг (offer/answer/ICE и жизненный цикл звонка) по существующему WebSocket обоих пулов (`/ws`, `/ws/student`). Гудок при дозвоне у звонящего и рингтон при входящем вызове (244f674, f477da0)
- Управление во время звонка: микрофон и камера с индикаторами у собеседника, режим «только аудио» при отсутствии или запрете камеры (камеру можно включить позже), демонстрация экрана по правилу «один за раз» с возвратом к камере. Кнопка демонстрации скрыта в браузерах без `getDisplayMedia`; пока собеседник показывает экран, своя плитка уменьшается (132x80 на десктопе, 72x96 на телефоне): при выключенной камере в ней маленький аватар без подписи о камере, значок микрофона тоже меньше (244f674, 68be437)
- Краевые состояния с русскими сообщениями: «Ученик/Репетитор сейчас не в сети», «Абонент занят», «Нет ответа» (таймаут 40 с), «Вызов отклонён», «Пропущенный вызов от …», «Собеседник завершил звонок», обрыв соединения, отказ камеры/микрофона у собеседника. Камера и микрофон освобождаются при любом завершении (244f674, 83e9163, 68be437)
- История звонков: репетитор и ученик видят только звонки своей пары от новых к старым (собеседник, направление, время, длительность, статус) — `GET /api/calls/history` и `GET /api/student/calls/history`. Звонок офлайн-собеседнику записывается как пропущенный; открытая страница истории обновляется в фоне по событию `call_history_updated` (без оверлея, по одному запросу за раз, ответ после ухода со страницы отбрасывается), ошибка загрузки показывается с кнопкой «Повторить» (244f674, 68be437)
- ICE-конфигурация STUN-first / TURN-fallback: бэкенд выдаёт временные HMAC-креды coturn на каждый звонок (секрет не уходит в браузер), без TURN работает в режиме STUN-only. Новые env: `STUN_URL`, `TURN_URL`, `TURN_SECRET`, `TURN_CREDENTIAL_TTL` (244f674)
- Таблица `call_records` (миграция `20261016120000_030_call_records`, enum'ы `CallStatus` / `CallerKind`) — одна запись на каждый завершённый или несостоявшийся звонок пары (244f674)
- E2E-сценарии `students/video-call.spec.ts` и `students/call-history.spec.ts` (68be437)

### Changed
- Сигналинг передаёт причину завершения: `call_ended.reason` (`hangup` / `peer_disconnected` / `media_unavailable`), `call_canceled.reason` (`canceled` / `timeout`), `call_hangup.reason: "media_unavailable"`; собеседник узнаёт о завершении до записи в БД. Контракт описан в `specs/030-webrtc-video-calls/contracts/signaling-ws.md` (68be437)
- Лимит частоты приглашений в звонок на участника, валидация запроса истории, общие обработчики сигналинга вынесены в `signaling.helpers.ts` / `signalRouting.model.ts` по итогам шести раундов локального code review (отчёты в `docs/code-reviews/030-webrtc-video-calls/`) (68be437)

- По итогам ревью на костыли: логика звонка перенесена из `lib/websocket` в `services/callSignaling/callFlow.ts`, отправка идёт через `getWebSocketManager()` без параметра `send` ради тестов; ошибка записи `CallRecord` больше не проглатывается на нижнем уровне (при сбое `call_history_updated` не отправляется); ответы на приглашение сопоставляются по клиентскому `inviteId` (`call_ringing`/`call_busy`/`call_unavailable`/`call_error`), ICE-серверы звонящий получает только с `call_accepted`; статусы истории звонков отдаются значениями Prisma (`COMPLETED`, `MISSED`, …) (4a17170)
- Фронт звонка: фаза `connecting` у обеих сторон вместо флага `$wasConnected`, роль звонка (`$callRole`) хранится в модели, и терминальные сигналы уходят через сокет своей роли без фолбэка; входящие сообщения разбираются `parseCallSignal` с проверкой полей; потоки видео отдаются в UI сторами (`$localTileStream`, `$remoteStream`) вместо счётчика `$mediaEpoch`; экран звонка рендерится через портал вне `PullToRefresh`; плитка видео строится на сетке с таблицей вариантов `TILE_VARIANTS`, круглые кнопки звонка — один `RoundCallButton` (4a17170)
- Повторное приглашение звонящего, пока его прошлый вызов ещё звонит, заменяет этот вызов (собеседнику `call_canceled`, запись `CANCELED`) и для той же пары, и для другого ученика; приглашение, разрешившееся позже более нового, отбрасывается. Сигнал к неизвестному `callId` отбрасывается молча, `call_error` уходит только участнику чужого звонка (dbf8246, 378116d)
- Терминальные сигналы берут адрес звонка из `callTerminated`, все сигналы звонка уходят через один `sendCallSignalFx`: если сокета нужной роли нет, звонок завершается с «Нет связи с сервером…» без ложного тоста о сбое переговоров (dbf8246, 378116d)
- Пока свои камера и микрофон не получены, кнопки микрофона, камеры и демонстрации экрана неактивны и заметно приглушены (dbf8246, 378116d)
- Несколько вкладок или устройств одного пользователя: соединение держит последняя открытая вкладка, вытесненная больше не переподключается каждые 5 с (это обрывало звонки) и показывает «Приложение открыто в другой вкладке…» с кнопкой «Использовать здесь» (378116d). Идущий звонок держит свою вкладку: новая вкладка показывает «В другой вкладке или на другом устройстве идёт звонок…» без кнопки перехвата; автоматические переподключения идут с `resume=1` и не отбирают живое соединение, вытесненная вкладка пробует вернуться при возврате на неё; звонок из вытесненной вкладки подсказывает нажать «Использовать здесь» (de78327). Вкладка передаёт свой id (`tab=`), и сервер с пингом раз в 30 с даёт ей заменить свой полуоткрытый после обрыва сети сокет вместо ложного баннера; сокет считается подключённым только после `connection_ready`, поэтому отказ не мигает баннером. После выхода во вкладке-держателе остальные вкладки того же браузера тоже выходят (у репетитора и у ученика), а вкладки без этой сессии не трогаются. Сокеты репетитора и ученика работают на общей фабрике соединения (ea36bb9, d475117). Вкладка, открытая во время звонка, ждёт на открытом сокете (`connection_waiting`) без опроса, и сервер отпускает её кодом 4003, как только звонок закончился; вкладка, где сменили пароль или email, сама забирает соединение (d475117)

### Fixed
- Одновременное включение камеры обеими сторонами (perfect negotiation): видео больше не теряется при гонке переговоров (83e9163)
- Находки пяти прогонов ручного QA (`docs/manual-qa-reports/2026-10-19-030-webrtc-video-calls*.md`): отступы и плашка демонстрации экрана на низком экране, своя плитка больше не перекрывает «Завершить звонок» на телефоне, ошибка закрытия выбора экрана не показывается как сбой, история при первой загрузке не мигает «Звонков пока нет» (68be437)
- Сбой повторных переговоров посреди звонка больше не проходит молча: соединение откатывается (`rollback`), звонок продолжается, пользователь видит «Не удалось обновить видео собеседника…»; неудачная остановка демонстрации экрана сообщает «Не удалось вернуть камеру после демонстрации экрана»; на телефоне в режиме установленного приложения экран звонка больше не съезжает при прокрутке (4a17170)
- Устаревший ответ истории звонков (после ухода со страницы или более старый запрос) больше не перезаписывает свежий список: запросы нумеруются, применяется только более новый ответ (4a17170)
- Отзыв токена репетитора на WebSocket: `/ws` сверяет `tokenVersion`, а после смены пароля, смены email или сброса пароля сервер сразу снимает открытый сокет (код 4001, принудительный обрыв через 1 с) и завершает звонок; сообщения со снятого сокета игнорируются. Клиент на таком закрытии не переподключается по кругу со старым токеном: вкладка с новым токеном подключается сразу (в том числе по событию `storage` из соседней вкладки), остальные выходят на страницу входа. Временный сбой БД при проверке закрывает сокет кодом 1011 и не разлогинивает; кеш `tokenVersion` не откатывается на старую версию, а версия перепроверяется перед регистрацией сокета (dbf8246, 378116d, de78327)
- Сбой ответа на offer посреди звонка даёт один тост и один rollback; демонстрация экрана, запустившаяся после конца звонка, больше не попадает в следующий звонок; гудок и рингтон возобновляют приостановленный `AudioContext` на каждом импульсе; звонок из кабинета без привязанного репетитора не уходит (dbf8246)
- Уведомления, «Нет подключения» и подсказка установки снова видны поверх экрана звонка в установленном приложении: `PullToRefresh` в покое не задаёт `transform`; на низком экране демонстрация собеседника идёт на всю плитку, в компактном PiP помещается «Вы» (dbf8246, 378116d). Во время звонка плашка «Нет подключения к интернету» показывается сверху и не закрывает кнопки, а входящий вызов и экран звонка лежат выше блокирующего спиннера загрузки (de78327) и видны уже во время первой загрузки приложения; отказ в доступе к камере после конца звонка больше не показывает тост (ea36bb9)

### Infrastructure
- `/code-review-local` получил девятого ревьюера «Hacks & workarounds» (костыли: лечение симптома, проглоченные ошибки, тестовые швы в прод-коде, тесты вхолостую, дубли, переусложнение) со своей рубрикой оценки; угол добавлен и в `/improve-hunt` и `/bug-hunt`. Hunt-команды теперь работают в своём worktree с draft PR, на `opus` с max effort, после отчёта исправляют выбранное и гоняют круги `/code-review-local` и `/manual-qa --fix` (до 5, раньше при сходимости) (4a17170)
- `/bug-hunt` и `/improve-hunt` ревьюят исправления с `--base-ref HEAD`: отчёт к этому моменту закоммичен, и с base `main` ревью видело бы только его (dbf8246)
- Тесты звонка на бэкенде перенесены в `services/callSignaling/__tests__/callFlow.test.ts`, хелпер `waitFor` для ожидания наблюдаемых событий, без параметров в прод-коде ради тестов (dbf8246)
- Конвенции тестов: тестовые швы фичи — только в `<feature>/testSeams.helpers.ts`, сбросы модульного состояния бэкенда — в `src/__tests__/setup.ts`, без пиксельных проверок из styled-файлов, `mockReset` вместо `clearAllMocks` для очередей моков (4a17170)

## 2026-10-16

### Added
- Offsite copies of prod DB backups on the home dev machine: `scripts/offsite-backup/pull-backups.sh` pulls new `*.sql.gz` hourly over a dedicated SSH key into `/home/roman-kaluger/prod-backups/`, checks each copy with `gzip -t` and keeps 90 days under a 20 GiB cap (the newest copy is never deleted; a failed pull runs no retention and only removes copies that fail `gzip -t` or have an unexpected name). Only strictly named files inside the 90-day window are requested, existing copies are never overwritten and files over 1 GiB are refused. On prod the key is confined by `authorized_keys` (`from=`, `restrict`, forced command) to `prod-ssh-wrapper.sh`, which allows only a read-only `rrsync -ro` of the backup dir and a strictly validated `report-restore-check` command, and records the last successful pull. Prod gets no access to home (036-offsite-backups)
- Daily restore check at home: `restore-check.sh` (hourly from cron, self-throttled to 24 h, `--force` to bypass) restores the newest copy into a throwaway `postgres:16-alpine` container without network (data in tmpfs, no swap, memory/CPU/pids limits, every docker call under a timeout), reports `stale_copy` without restoring when the newest copy is older than 48 h, checks that `users`, `students` and `lessons` exist and are non-empty, always removes the container and reports the result to prod (036-offsite-backups)
- Admin «Бэкапы» tab shows «Резервное хранилище: …» (warning when never pulled or older than 24 h) and «Проверка восстановления: …» with counts or the error reason (warning when missing, failed or older than 48 h); `GET /api/admin/backup/settings` returns `minRetentionDays`, `storageLimitExceeded` and `offsite { lastSyncAt, restoreCheck }` read tolerantly from status files next to the backups (036-offsite-backups)
- `docs/ops/offsite-backups.md`: where copies and logs live, one-time setup of prod and home (cron runs installed copies from `~/.local/share/offsite-backup/`, not the dev checkout), manual runs, admin warnings, restoring prod from a home copy, updating and disabling; pointer in `CLAUDE.md` (036-offsite-backups)

### Changed
- Prod backups are never deleted before they are 30 days old: the size limit only removes older backups (age from the UTC timestamp in the file name), and when fresh backups alone exceed it the admin shows «Лимит превышен: бэкапы младше 30 дней не удаляются. Увеличьте лимит.» under a new 30-day hint next to the settings (036-offsite-backups)
- `pg_dump` writes to `backup-<ts>.sql.gz.tmp` and the file is renamed only after the size check, so neither the file list nor the offsite pull sees a half-written dump; temp files older than 24 h are cleaned up. The flat `services/backup.ts` is split into `services/backup/` (`backup`, `.constants`, `.helpers`, `.types`, `offsiteStatus`) (036-offsite-backups)
- Both `tsconfig.json` files turn on `noUnusedLocals`, `noImplicitReturns` and `noFallthroughCasesInSwitch` (closes 0.4 of `docs/lint-roadmap.md`). The frontend needed no fixes; in the backend 33 handlers across 25 files mixed `return res.…` early exits with a trailing bare `res.…` call and now return on every path — the three that keep notifying over WebSocket after responding (`createLesson`, `deleteLesson`, `updateLesson`) end with `return;`, and the three auth middlewares with `return next();` (bc073a5)
- Three more conventions moved from review to ESLint (Milestone 8 of `docs/lint-roadmap.md`): `.on()` on a store is rejected by `no-restricted-syntax` (stores are updated with `sample`), `effector/keep-options-order` enforces the `{ clock, source, filter, fn, target }` order that `frontend.md` prescribes, and a Cyrillic-free string literal under `error:` inside a backend `.json(...)` payload is rejected. `frontend.md`, `backend.md` and the roadmap record what is enforced and what stays review-checked (bc073a5)
- Follow-up from the local code review (`docs/code-reviews/worktree-chore-lint-m8-leftovers/iter-1.json`): the Russian-message rule also covers `rateLimit({ message: { error } })`, which `express-rate-limit` sends as the response body without going through `res.json`; the three statistics handlers return on every branch like the other 25 files; `backend.md` states when `noImplicitReturns` actually fires, `frontend.md` records the two limits of `keep-options-order` (it knows nothing about effector 23's `batch` / `name` and its quick fix drops what it does not know), and the roadmap's baseline table and its stale `.on()` note are up to date (5424688)

### Fixed
- A malformed or oversized request body came back as `500 Внутренняя ошибка сервера`, because the global error handler ignored the status the body parser sets. It now answers `400 Некорректный запрос` / `413 Тело запроса слишком большое`, logs a stack only for real server errors and hands an error raised after the response to `next(err)` (5424688)
- Six API error messages were still English and reached the user as is: `Internal server error` from the three statistics endpoints, `Something went wrong!` from the global error handler, `Route not found` from the 404 handler and `no mail` from the e2e mailbox route. All are Russian now, and `backend/src/__tests__/errorResponses.test.ts` keeps the two app-level handlers covered (bc073a5)
- Saving a lesson could fail with `500 Внутренняя ошибка сервера` when other tutors were editing their lessons at the same moment: the update ran under Serializable isolation, whose btree predicate locks cover whole index pages, so unrelated tutors' writes aborted it with `P2034` and three retries were not always enough. `applyLessonUpdate` now takes a per-tutor advisory lock (`pg_advisory_xact_lock(1001, hashtext(tutorId))`) under the default isolation, which still keeps two concurrent moves of one tutor from both passing the overlap check; `lessonUpdateConcurrency.test.ts` covers both sides (84c180e)
- The e2e helper `fetchLatestMail` took the mailbox's 404 body (`{ error: "Письмо не найдено" }`) for a mail, so `waitForMail` without a predicate returned at once instead of waiting; `reschedule-lesson.spec.ts` called a hardcoded `localhost:3001` instead of `E2E_API_URL` (84c180e)

### Infrastructure
- `scripts/dev-stack.sh run-backend-e2e` no longer depends on a personal `backend/.env`, which the backend never reads: it sets fixed test JWT secrets and a test admin (`admin@e2e.local` / `E2eAdmin!2026`), so `e2e/admin/*` pass locally. `run-backend` loads `backend/.env` through `dotenv-cli` (the branch's port and database still win) — before, the dev server crashed on a missing Resend key. `run-backend`, `run-backend-e2e` and `test-backend` put the `pg_dump` matching the stand's Postgres image first on `PATH`, since Ubuntu's wrapper picks the local cluster's older client and `pg_dump` refuses a newer server. `scripts/__tests__/dev-stack.test.mjs` covers the wrappers; `docs/dev-stack.md` is corrected (84c180e, f745046)
- Unit tests for e2e helpers live next to them as `e2e/helpers/<name>.test.ts`: vitest now skips only `e2e/**/*.spec.ts`, and Playwright matches only `*.spec.ts` (84c180e)

## 2026-10-12

### Added
- История поступлений в отчётах (`specs/035-income-history`). На странице отчётов появились вкладки «Сводка» и «История поступлений» (вкладка живёт в Effector-сторе `reportsTabsModel.$activeTab`: переживает уход со страницы, но не перезагрузку, в URL не пишется); в карточку «Поступления за период» добавлена ссылка «История поступлений по дням». История показывает оплаты применённого периода по дням оплаты (в часовом поясе из `X-Timezone`, оплата без даты попадает на день урока) от новых к старым: итог дня и периода, имя ученика (или контакт пробного урока, пометка «Архив»), предмет, тип и время урока, статус не проведённого урока, пометка «дата оплаты не указана», налог по оплате и зачёт в счёт комиссии. Итоги совпадают с карточками «Поступления за период», «Налог», «Не облагается налогом» и «Списано в счёт комиссий» за тот же период
- Эндпоинт `GET /api/statistics/income-history?startDate&endDate[&before|&through]` (сервис `services/incomeHistory`): тот же набор оплат, что у карточки (`paidInRangeWhere`), налог по ставке на дату оплаты через общий `resolveLessonTax`, FACT-зачёт комиссии из `allocateCommission`, суммы в целых копейках. Порции по 50 оплат целыми днями: курсор `before` (ключ дня) продолжает со следующего дня, `through` перезагружает все дни до указанного включительно; `page.remainingCount` — сколько оплат осталось. Неверный период или курсор (или `before` вместе с `through`) — `400 «Некорректный период»` / `«Некорректная позиция продолжения истории»`
- Порционная подгрузка «Показать ещё (осталось N)» без общего оверлея (индикатор на кнопке, ошибка с «Повторить» не стирает показанные дни), защита от устаревших ответов счётчиком поколения `$historyVersion`; первая порция грузится вместе с карточками на любой вкладке
- Переход к уроку из истории: нажатие или Enter по строке загружает урок (`GET /api/lessons/:id`) и открывает тот же попап, что в списке уроков, поверх вкладки. Любая правка из попапа и формы (оплата, дата оплаты, «Получено», стоимость, налог, статус, удаление) перезагружает карточки и историю на ту же глубину (`through` = последний загруженный день) без перезагрузки страницы, с сохранением периода, вкладки и прокрутки. Удалённый урок — уведомление «Урок не найден: возможно, он удалён. История поступлений обновлена» и обновление данных. Загрузка первой порции и открытие урока идут через глобальный оверлей
- Полученная сумма за урок: колонка `lessons."receivedAmount" DECIMAL(10,2)` (миграция `add_lesson_received_amount`, бэкфилл: у оплаченных уроков равна стоимости, у неоплаченных `NULL`, поэтому все показатели за прошлые периоды не меняются). Поле «Получено (₽)» в диалогах отметки оплаты (окно урока, значки в списке, форма) — по умолчанию стоимость урока, ошибка блокирует «Подтвердить» и Enter — и в форме редактирования оплаченного урока рядом с датой оплаты. `PUT /api/lessons/:id` принимает `receivedAmount`; без него при отметке оплаты записывается стоимость, снятие оплаты стирает сумму, перенос оплаты при отмене переносит полученную сумму на урок-получатель. Валидация: `400 «Полученная сумма должна быть неотрицательным числом не больше 99 999 999,99 ₽ с точностью до копеек»` и `«Полученную сумму можно указать только у оплаченного урока»`
- Пометка расхождения полученной суммы и стоимости (`shared/ui/ReceivedAmountHint`): значок рядом с суммой в строке истории (подсказка по наведению, фокусу и тапу, нажатие не открывает урок) и «получено M ₽» у стоимости в окне оплаченного урока. В кабинет ученика и его WebSocket-события полученная сумма не попадает
- E2E-сценарии `reports/income-history.spec.ts` (сверка с карточкой, попап из строки, снятие оплаты без перезагрузки, «Показать ещё» на 60 оплатах) и `lessons/received-amount.spec.ts`; тестовые роуты `POST/PATCH /api/__test__/lessons` принимают `receivedAmount`

### Changed
- Показатели, считающие пришедшие деньги, берут полученную сумму вместо стоимости: «Заработок», заработок прошлого месяца, предоплата, «Поступления за период» (в выборку входят оплаты с полученной суммой > 0), налог и необлагаемые суммы, «Оплачено за период» на странице уроков, фактические зачёты комиссии (списано, прогресс погашения, пометка на карточке урока). Долг, потери от отмен, предстоящий доход, прогноз комиссии и `/statistics/by-*` по-прежнему считаются от стоимости. Диалог отмены с переносом показывает переносимую полученную сумму
- Набор диалогов урока (форма, попап, подтверждение, удаление, перенос) вынесен из страницы уроков в `features/lessons/ui/LessonDialogs` и подключён на страницах уроков и отчётов; кнопки попапа на отчётах работают так же, как в списке
- `ConfirmStatusDialog` получил `confirmDisabled`; описание рендерится в `div`, без вложенного `<p>` в `<p>`
- Отмена оплаченного урока, когда переносить оплату некуда (нет следующего неоплаченного урока ученика той же стоимости или урок без ученика), больше не снимает оплату: урок остаётся оплаченным с прежними датой и полученной суммой, поэтому деньги остаются в истории, «Поступлениях за период», налоге и зачёте комиссии. «Потери от отмен» не считают отменённые оплаченные уроки, а диалог отмены пишет «Оплата останется у этого урока…»
- Обработчик WebSocket `lesson_status_updated` перечитывает урок (`lessonModel.syncLessonFx`, `GET /api/lessons/:id`) вместо `PUT {status}`. Списки, окно урока и зачёт комиссии обновляются по общему событию `lessonModel.lessonChanged`
- `frontend/e2e/**` and `frontend/playwright.config.ts` are now type-checked, linted and format-checked like `frontend/src` (closes Milestone 7 of `docs/lint-roadmap.md`): `frontend/tsconfig.json` includes them, so `npx tsc --noEmit` in CI covers e2e, and `npm run lint` / `lint:fix` / `format` / `format:check`, `frontend/.lintstagedrc.json` and the pre-commit hook's staged-file filter take them as well. The e2e ESLint override turns off every Jest and Testing Library rule (`react-app/jest` enables them for any `*.spec.*` file, and `prefer-screen-queries` alone flagged 282 `page.getByRole` calls) and adds `eslint-plugin-playwright` (`no-focused-test`, `no-page-pause`, `no-wait-for-selector`, `no-wait-for-timeout`, `no-raw-locators`, `valid-test-tags` with the tag-scheme allowlist), `no-restricted-syntax` selectors that require a level and an area tag on every `test.describe`, kebab-case file and folder names (PascalCase for page objects in `e2e/pages/`) and a default-export exception for `playwright.config.ts`. `e2e-testing.md`, `frontend/e2e/README.md` and `CLAUDE.md` state what is enforced (226c101)
- The 13 raw Playwright locators (CSS attribute selectors, `.nth()`, XPath, `text=`) are rewritten with `getByLabel` / `getByRole` / `getByText` / `getByTestId`; the tax amount in reports carries `data-testid="tax-amount"` and the earnings amount is read by its existing `data-testid="earnings"`, since nothing in the markup ties an amount to its card title (226c101)
- `frontend/e2e` reformatted with Prettier 3: 56 files, code wrapped at 80 columns under the `printWidth: 100` config. The commit is listed in `.git-blame-ignore-revs` (f107631)
- Follow-up from the local code review (`docs/code-reviews/worktree-chore-lint-m7-e2e/iter-1.json`): the e2e override no longer inherits the FSD `no-restricted-imports` patterns (`../**/pages/**` would have rejected the first page object) and lets `e2e/pages/index.ts` through the PascalCase naming rule; the tag selector also covers `test.describe.serial.only(...)`; `playwright/no-element-handle` and `playwright/no-eval` are enforced, and `e2e-testing.md` / `frontend/e2e/README.md` now state what `no-raw-locators` actually catches (only `locator()` with a string literal, not `page.click("…")` or a selector in a variable); `/e2e-check` and `/e2e-hunt` stop prescribing tags the new rules reject (`@critical`, and dropping `@draft` without putting `@regression` in its place); new unit tests cover the password masking of `RegisterFormFields` / `StudentInviteForm` and the numeric `inputmode` of the code inputs, which the replaced CSS locators guarded implicitly (ab82b47)

### Fixed
- На каждое начало и окончание урока и на собственную смену статуса фронт отправлял обратно `PUT {status}`: отсюда второй одинаковый запрос при отмене урока, лишнее уведомление «Урок обновлен» и общий оверлей
- Форма «Редактировать урок» не закрывалась после успешного «Обновить урок»
- В форме завершённого урока поле «Ученик» было пустым, если ученик не в архиве
- Параллельный первый вызов `getBackupSettings` мог упасть с `P2002`: `upsert` в Prisma 6 делает select-then-insert и не атомарен. Проигравший гонку вызов теперь перечитывает строку-синглтон, как уже сделано в `getReminderSettings`
- The six code-digit inputs on the email verification screen and in the change-email dialog had no accessible name, so screen readers could not tell which digit a field holds; each now has `aria-label="Цифра N из 6"` (226c101)
- `push-subscribe.spec.ts` failed on every run: it clicked the «Уведомления» tab only when a non-waiting `isVisible()` found it right after navigation, which never happened; the click now waits for the tab (226c101)

### Infrastructure
- Локальный backend `npm test` ходил в dev-базу из `backend/.env`, а не в `tutor_test`: импорты в `setup.ts` поднимаются выше вызова dotenv, Prisma-клиент успевал загрузить `backend/.env`, а `.env.test` грузился без `override`. Тесты зависели от состояния dev-базы (после новых миграций падали десятки сьютов) и чистили в ней `news` и `backup_settings`. Env теперь грузится в jest `setupFiles` (`src/__tests__/loadTestEnv.ts`) с `override`; регрессионный тест `testEnv.test.ts` сверяет базу подключения с `.env.test`. CI не затронут: там `.env.test` нет и `DATABASE_URL` задаёт workflow
- Правила параллельно-безопасных тестов (`uniqueEmail`, `CronScope`, `acquireGlobalTestLock`, явный период, отдельная тестовая база) записаны в `docs/conventions/backend-testing.md`, шаблон интеграционного теста больше не использует `faker.internet.email()`
- Флакающие backend-тесты стабилизированы (5 полных параллельных прогонов подряд без падений):
  - кроны `processRecurringLessons`, `updateLessonStatuses` и `processScheduledReminders` принимают необязательный `CronScope` (`{ tutorIds }`). Тесты передают свои id, поэтому крон из одного файла больше не достраивает серии, не переключает статусы и не забирает напоминания у уроков соседних файлов (так падал `deleteLesson` «deleteAllFuture…»). Продовые cron-тики работают без scope, как раньше;
  - три файла, которые делят строку `backup_settings`, сериализуются через Postgres advisory lock (`acquireGlobalTestLock` в `backend/src/__tests__/helpers`);
  - в `NODE_ENV=test` bcrypt хеширует с cost 4 вместо 12. Под параллельной нагрузкой это снимает таймауты bcrypt-сьютов и `reminderProcessor`;
  - тестовые email генерируются через `uniqueEmail()` со случайным доменом: глобально уникальные `User.email` и `StudentUser.email` больше не ловят коллизии faker;
  - `getStatistics` «unpaid over 24h» и «upcoming» передают явный период и больше не падают 1–2 числа и вечером последнего дня месяца; `recurringHelpers` «stable recurring key» выравнивает `now` по минуте; `lessonReminders` ждёт асинхронного создания напоминаний опросом, а не фиксированной паузой 200 мс; тест батча из 100 напоминаний получил таймаут 30 с
- New frontend devDependency `eslint-plugin-playwright` 2.11: it only needs `eslint >=8.40` and still ships legacy `.eslintrc` configs, so it fits the frontend's ESLint 8 / TypeScript 4.9 setup (226c101)

## 2026-10-11

### Added
- Уроки без налога (`specs/034-tax-exempt-lessons`). У урока появился признак «Не облагается налогом» (`lessons."isTaxExempt" BOOLEAN NOT NULL DEFAULT false`, миграция `add_lesson_tax_exempt`); у всех существующих уроков он выключен. Признак идёт существующими `POST/PUT /api/lessons` и валидируется явно по типу: не-булево значение даёт `400 «Некорректное значение признака «Не облагается налогом»»`
- Переключатель «Не облагается налогом» в окне просмотра урока (сохраняется сразу, без подтверждения, событие `lessonTaxExemptChanged`; при ошибке остаётся в прежнем положении) и в форме создания и редактирования урока с подсказкой. Оба места используют общий компонент `features/lessons/ui/TaxExemptSwitch` (MUI `Switch` с `role="switch"`, оформлен как «Оплачено» / «ДЗ»). Форма всегда отправляет признак булевым значением, поэтому снятый признак сохраняется
- Регулярное занятие, созданное с признаком, ставит его всем урокам серии; ночное продление серии наследует признак от последнего урока паттерна, как стоимость. Правка признака у одного урока серии меняет только этот урок
- Статистика: оплаты необлагаемых уроков исключаются из налоговой базы до расчёта по периодам ставок (`computeTaxSummary`), их сумма отдаётся новым полем `taxExemptIncome` (`null` при выключенном учёте налога, сумма в целых копейках) и показывается последней строкой «Не облагается налогом: N ₽» в подсказке карточки налога; info-иконка появляется и при одной ставке, если такие оплаты есть. «Заработок», «Поступления за период», задолженность, потери, предоплата и показатели комиссий от признака не зависят
- Значок «0% без налога» рядом со стоимостью у помеченных уроков в списке и «0%» в ячейке расписания, с подсказкой по наведению, фокусу и тапу (`shared/ui/TaxExemptBadge`, хук `useTooltipTrigger`); тап по значку не открывает урок. Всё налоговое скрыто, пока учёт налога в профиле выключен (`useIsTaxEnabled`); в кабинет ученика и его WebSocket-события признак не попадает
- E2E-сценарии `lessons/tax-exempt-lesson.spec.ts` и `reports/tax-exempt-statistics.spec.ts`; тестовый роут `POST /api/__test__/lessons` принимает `isTaxExempt`

### Changed
- Подсказка с разбивкой налога (`TaxRateInfoTooltip`) открывается через общий хук `useTooltipTrigger`: наведение отслеживается только для мыши, тап открывает подсказку, а не переключает её. Подсказки налога и значка описывают свой триггер (`describeChild`), не подменяя его доступное имя

### Fixed
- Любое сохранение без явного статуса (переключатель ДЗ в окне урока, форма редактирования) переводило прошедший отменённый урок в «Проведён»: в `computeUpdatedStatus` проверка «урок отменён и статус не передан» стояла после проверок по времени. Теперь отменённый урок остаётся отменённым; восстановление с явным `SCHEDULED` работает как раньше. Регрессионные юнит- и интеграционный тесты

## 2026-10-02

### Infrastructure
- The changelog gate before `gh pr create` / `gh pr ready` now also covers commands wrapped as `ssh <host> '<cmd>'`, used when a Claude Code session sees the repo through an sshfs mount while git, gh and the worktrees live on the dev machine. Previously the hook never fired for them (its settings filters only matched commands starting with `gh pr`), and on the mount it would have allowed anyway, since git cannot open worktrees whose gitdir points to dev-machine paths. The hook forwards the inner command to the same script on that host (`CHANGELOG_GATE_REMOTE_REPO`, default `~/kaluger-super-app`) and expands `~` / `$HOME` in `cd` targets; eight new scenarios run through a fake ssh (def4b57)

## 2026-09-22

### Added
- Учёт комиссий по ученикам (`specs/033-commission-tracking`). У ученика появилось поле «Комиссия» — разовая неотрицательная сумма посреднику (`students.commissionAmount DECIMAL(10,2) NOT NULL DEFAULT 0`, миграция `add_student_commission`); у всех ранее заведённых учеников она равна 0. Поле задаётся в той же форме создания/редактирования ученика и валидируется на трёх уровнях: подсказка под полем, guard в Effector-модели формы (отрицательная комиссия не даёт сохранить) и явная серверная проверка (`«Комиссия не может быть отрицательной»`, `«Комиссия должна быть числом»`; пустое значение и `null` нормализуются в 0)
- Пометка «в счёт комиссии» у уроков: рядом со стоимостью урока в списке и в окне просмотра показывается зачтённая сумма с бейджем-рукопожатием — фактическая у завершённых и оплаченных уроков и прогнозная («~сумма», пунктирный контурный значок) у предстоящих и ещё не оплаченных. Зачёт нигде не хранится: чистая функция `allocateCommission` (`backend/src/utils/commission.ts`) раскладывает комиссию по урокам ученика в два прохода (факт → прогноз) в целых копейках: факт — в порядке поступления денег (по дате оплаты, при её отсутствии по дате урока), прогноз — хронологически по дате урока, оба с детерминированным tie-break по `id`. Отменённые и бесплатные уроки не гасят комиссию, уроки без ученика пометок не получают
- Два новых показателя на странице статистики: «Списано в счёт комиссий» за период (по дате оплаты — той же базе дат, что у «Поступлений за период» и налога) и «Осталось погасить комиссий» — снимок на текущий момент по неархивированным ученикам, не зависящий от фильтра дат. Показатели появляются только у репетиторов, у которых есть хотя бы один ученик с ненулевой комиссией
- Блок прогресса погашения в карточке и в окне просмотра ученика: комиссия, погашено, осталось; при полном погашении — тихая строка «Комиссия N ₽ — выплачена». «Погашено» и «осталось» считаются только по фактическим зачётам и в сумме всегда точно равны заданной комиссии
- E2E-сценарии `students/student-commission.spec.ts`, `lessons/lesson-commission-credit.spec.ts`, `reports/commission-statistics.spec.ts`

### Changed
- Страница статистики разделена на показатели за период и группу снимков «Не зависит от выбранного периода». «Предоплата» перенесена в эту группу — её значение и оформление не изменились, изменилось только место на странице. Группа присутствует всегда, даже когда комиссий нет
- `formatCurrency` получил необязательный параметр `{ withKopecks }` — им пользуются только новые показатели комиссий, чтобы остаток меньше рубля отображался дробным. Поведение по умолчанию (целые рубли) не изменилось ни на одном из существующих call-site'ов
- `GET /api/lessons` и `GET/POST/PUT /api/students` обогащаются полями комиссии одним батч-запросом на всех учеников выдачи (без N+1); у репетитора без ненулевых комиссий дополнительный запрос к урокам не выполняется и в ответах не появляется ни одного нового поля. `fetchLessonsPage` принимает `tutorId` и впервые получает маппер поверх сырых строк Prisma
- После мутаций урока активный список уроков и список учеников перезагружаются, чтобы пометки и прогресс пересчитались в рамках сеанса; перезагрузка включается только при наличии учеников с ненулевой комиссией (`features/lessons/models/commissionReload.model.ts`)
- «Заработок», налог и его разбивка, «Поступления за период» и «Предоплата» комиссия не уменьшает — это закреплено интеграционным тестом, сравнивающим показатели до и после задания комиссий
- У `lessons` появился индекс `[studentId, startTime]` (миграция `add_lesson_student_start_time_index`). До него ни один индекс не начинался с `studentId`, и выборка уроков для раскладки комиссии читала все уроки репетитора, отфильтровывая лишние уже после чтения. Индекс также покрывает выборку последних уроков в `getStudents` (`include: { lessons: { orderBy: startTime desc, take: 5 } }`) и каскадное удаление уроков вместе с учеником

### Removed
- Временная страница макетов `frontend/src/pages/CommissionMockupPage/` вместе с маршрутом `/mockups/commission/:section`, её lazy-импортом и временным ре-экспортом `LessonCard` из `features/lessons/ui/index.ts` (он расширял публичный API слоя вопреки FSD). Все 18 маркеров `TODO(auto-feature)` сняты

## 2026-09-12

### Changed
- Formatting and staged-file linting are now tool-enforced (closes Milestone 6 of `docs/lint-roadmap.md`). A committed pre-commit hook (`.githooks/pre-commit`) runs `lint-staged --no-stash`: `eslint --fix` and `prettier --write` on staged `frontend/src` / `backend/src` files, with one config per package so the tasks run from the package directory. `npm install` at the repo root enables it for the main checkout and every worktree: the `prepare` script (`scripts/install-git-hooks.mjs`) writes a dispatcher into the shared git hooks dir that runs the committing tree's own `.githooks/pre-commit`. Husky was not used because its relative `core.hooksPath` breaks in worktrees (Claude Code rewrites it to the main checkout's path on worktree creation). `--no-stash` keeps lint-staged off the stash stack that all worktrees share; a worktree without a root install borrows the main checkout's `lint-staged`, and a commit stops with a hint when the staged package has no `node_modules`. `CLAUDE.md`, `frontend.md` and `backend.md` document the hook and mark Prettier formatting as tool-enforced (0495b32, ccc3449)
- `frontend/src` and `backend/src` reformatted with Prettier 3 under the shared config: 318 files, mostly code wrapped at 80 columns (backend had no Prettier config, so Prettier's default of 80 applied; much of the frontend code was wrapped at 80 despite its `printWidth: 100` config). The commit is listed in `.git-blame-ignore-revs` (4c0d538)
- Follow-up from the local code review (`docs/code-reviews/worktree-chore-lint-m6-enforcement/iter-1.json`): the pre-commit hook keeps lint-staged's backup stash whenever a file is partially staged, because with `--no-stash` lint-staged 16.4 does not restore their unstaged hunks after a failed task (a test runs the real lint-staged against it); the tasks run `prettier --write` before `eslint --fix` and once more after it, so `max-lines` counts the formatted file; `scripts/install-git-hooks.mjs` no longer writes into a `core.hooksPath` from the global or system git config or into any `.githooks/` directory; `landing/next.config.ts` pins `turbopack.root`, since the root `package-lock.json` made Next.js infer the repo root as its workspace root (build output unchanged) (33b730b)
- Follow-up from the local code review (`docs/code-reviews/worktree-chore-lint-m6-enforcement/iter-2.json`, its critical finding only): the pre-commit hook stops a commit when a staged package's installed Prettier differs from its `package-lock.json`, the case of a `node_modules` symlinked from a main checkout that was pulled but not reinstalled, which would otherwise format the staged files with another Prettier than CI's `format:check`; the hint names the directory to run `npm install` in (d5d0eef)
- File and folder naming conventions are now ESLint-enforced via `eslint-plugin-check-file` (#25 of Milestone 5 in `docs/lint-roadmap.md`). Frontend: `*.tsx` PascalCase, files directly in `api/`, `model(s)/`, `types/` camelCase, other `.ts` letters and digits only, folders camelCase/PascalCase, plus a role-suffix allowlist (`.model`, `.api`, `.types`, `.styled`, `.constants`, `.helpers`, `.hooks`; a plain `<name>.ts` only inside `api/` and `types/`). 99 kebab-case files were renamed to camelCase (models next to their component became `<Component>.model.ts`) and 11 files got a role suffix (`dateFormat.helpers.ts`, `navigation.helpers.ts`, `tokenStorage.helpers.ts`, `themeConfig/*.constants.ts`, `shared/domain.constants.ts`, `app/app.types.ts`, `LessonForm.types.ts`, `StudentForm.types.ts`). Backend: camelCase files and folders plus the role-suffix allowlist from `backend.md` — `WebSocketManager.ts` → `webSocketManager.ts` with its tests, `routes/__test__.ts` → `routes/testSupport.ts`, two kebab-case tests renamed (71119fc)
- Test-runner rules are ESLint-enforced (#26): no `.only` / `.skip` in frontend and backend tests (`jest/no-focused-tests`, `jest/no-disabled-tests`; on the frontend they also catch `it`/`describe` imported from `vitest`) and no `done` callbacks in backend tests (`jest/no-done-callback`) — five WebSocket test hooks now await a promise instead (71119fc)
- Follow-up from the local code review (`docs/code-reviews/worktree-chore-lint-m5-naming-tests/iter-1.json`): the frontend file-naming check is off only for the CRA-fixed `src/index.tsx` and `src/react-app-env.d.ts` instead of every `*.d.ts`, so kebab-case or snake_case declaration files are rejected; the `frontend.md` File Naming section states its scope (`frontend/src/**`, e2e specs stay kebab-case), the CRA exceptions and exactly what ESLint checks versus what stays review-checked (PascalCase vs camelCase outside `api/`, `model(s)/`, `types/`, folders included); two comments and 29 `describe` titles no longer name the pre-rename kebab-case modules (5af9868)

### Removed
- Dead `frontend/src/setupTests.ts` (CRA leftover — vitest loads `src/__tests__/setup.ts`) and `frontend/src/shared/ui/theme.ts` (a one-line re-export of `./themeConfig`) (71119fc)

### Infrastructure
- CI runs `npm run format:check` in the frontend and backend jobs (`.prettierrc` is in both path filters), and a new `scripts` job runs `node --test scripts/__tests__/` when `scripts/**` or `.githooks/**` change; the hook and its installer are covered by fixture tests on temp git repos. Prettier 3.9 replaces 2.8.8 in frontend and is added to backend with new `format` / `format:check` scripts; the config moved from `frontend/.prettierrc` to the repo root; `lint-staged@16` is a root devDependency (0495b32)
- The `scripts` CI job installs the root dependencies (`npm ci --ignore-scripts`) for the real-lint-staged test and also runs on root `package.json` / `package-lock.json` changes (33b730b)
- New devDependencies: `eslint-plugin-check-file` (frontend 2.8 for the legacy `.eslintrc.js`, backend 3.x) and `eslint-plugin-jest` (frontend 25.x — the version `react-app/jest` already loads, now explicit; backend 29.x). `docs/lint-roadmap.md` closes Milestone 5 and adds Milestone 7 — linting `frontend/e2e/**`, which `npm run lint` does not cover yet (71119fc)

## 2026-09-11

### Changed
- Tier B conventions are now ESLint-enforced via `no-restricted-syntax` selectors (closes Milestone 4 of `docs/lint-roadmap.md`). Frontend: no `useUnit([...])` array destructuring; `styled` only from `@shared` (`@mui/material`, `@mui/material/styles`, `@mui/system`, `@emotion/styled`, `styled-components` are banned except in the `shared/lib/styled.helpers.ts` wrapper) — 11 files switched; no raw `setTimeout`/`setInterval` in `*.model.ts` — both WebSocket reconnect effects rewritten with patronum `delay` plus an explicit `$isReconnectScheduled` guard, their tests moved to fake timers and the student model gained the reconnect tests it lacked; models are imported as namespaces (named value imports from `*.model` files are rejected in prod code, `import type` and tests are exempt) — 10 files switched; empty files and `export {}` stubs are rejected (`*.d.ts` excluded). Backend: `class X extends Error` is rejected outside `src/utils/errors.ts`; empty files and stubs are rejected; `jest.mock("…prisma…")` is rejected — the one offender, the auth middleware test, now runs against the test DB with real JWTs and gained tokenVersion-mismatch and unknown-user cases. Both ESLint configs build the selector list from named constants so per-file overrides can drop a single entry. `docs/conventions/*` mark the rules as ESLint-enforced (8b1b524). Follow-up from the local code review (`docs/code-reviews/worktree-chore-lint-m4-tier-b/iter-1.json`): the `*.d.ts` override lifts only the empty-file rules instead of turning `no-restricted-syntax` off, so enums stay banned in declaration files; the `export {}` stub selector matches only a file whose sole statement is the stub (`Program[body.length=1]`); the reconnect delay constants moved to `web-socket.constants.ts` / `student-web-socket.constants.ts`; `docs/conventions/frontend.md` documents the fake-timers pattern for testing patronum `delay` (b02b67c)
- Frontend a11y and size limits are now ESLint-enforced (closes Milestone 1 of `docs/lint-roadmap.md`): `plugin:jsx-a11y/recommended` runs as errors (`no-autofocus` is off — every hit was the first field of a form/dialog; the static-element interaction rules are off only under `__tests__`, where `<div onClick>` wrappers probe event propagation), and `max-lines` caps `*.tsx` at 150 and `*.model.ts` at 200 code lines (blank lines/comments not counted, tests excluded). The 5 components over the limit were split rather than grandfathered: `AppRoutes` → `AppRoutes.constants` + `RouteFallback`, `LessonFormContent` → `LessonStatusSection` + `RecurringCheckbox`, `StudentFormFields` → `ContactMethodSelect`, `InvitationManager` → `InvitationActions`, `FinancialStatistics` → `IncomeCards` + `DebtCard`, each with its own tests. The copy-link icon button in the invitation manager also gained an `aria-label`. `docs/conventions/frontend.md` marks the rules as ESLint-enforced (5506a29)

### Fixed
- WebSocket auto-reconnect (tutor and student cabinet) no longer opens a second socket when the user logs out and back in within the 5-second reconnect window, and a close event arriving right after that re-login is no longer swallowed. A pending patronum `delay` cannot be cancelled, so every explicit connect/disconnect now bumps `$reconnectGeneration` and a fired delay reconnects only if its generation is still current. Regression tests for both scenarios in both models (b02b67c)
- The lessons confirm dialog (cancel / restore / delete from the lesson view) no longer blanks its title and message during the close animation: `lessons-view-dialog.model` wrote a full reset into `$confirmDialog` on `confirmDialogClosed`, racing the owner model's `{ ...state, open: false }`. The duplicate writes are removed, with a regression test (b02b67c)
- Backend test `getStatistics › aggregates payments by paymentDate within selected range` failed deterministically in the first hour after local midnight (expected 4777, received 2277): the "paid earlier today" fixture used `now - 1h`, which lands on yesterday and drops out of the today-range. The payment date is now clamped to the start of today, so the test is time-of-day independent (verified red→green with `TZ=Asia/Magadan` at 00:48 local)

### Infrastructure
- `/code-review-local` and `/manual-qa` no longer fail to launch from a worktree session: their context blocks ran `git branch --show-current` inside a `$(...)` pipeline, which the worktree-isolation guard refuses as "too complex to verify". The substitutions now list `docs/code-reviews/` and `specs/` directly and the command picks the branch folder itself (the branch is already in the context one line above)
- The `check-changelog-before-pr` hook now resolves the PR branch from the `gh pr create` command itself (`cd <worktree> && …` prefix and/or `--head <branch>`) instead of the session's checked-out branch — it produced false denials whenever the PR was submitted from another worktree. It also ignores non-`gh pr create` commands that slipped through the settings filter. Scenario tests in `.claude/hooks/__tests__/check-changelog-before-pr.test.sh`
- Draft PR at task start: `scripts/start-task-pr.mjs` opens a draft PR as soon as a task branch/worktree exists (empty start commit if needed, HTTPS push via gh), recording the Claude Code session in the PR body — local id, `cd <launch dir> && claude --resume <id>`, web link. Re-running it from a later session comments that session on the existing PR. Made mandatory in `CLAUDE.md` and wired into `/auto-feature` (after the feature branch is created), `/auto-bug-fix` (Phase 0) and `/speckit.specify`; both orchestrators now finish with `gh pr edit` + `gh pr ready` instead of creating the PR
- The changelog hook now also gates `gh pr ready` (the draft PR from `scripts/start-task-pr.mjs` is not gated, so the changelog check moves to marking the PR ready)
- `/code-review-local` picks committed mode only when the committed diff is non-empty, so an empty start commit keeps `/auto-feature` and `/auto-bug-fix` reviews in working-tree mode

## 2026-09-07

### Added
- Isolated per-branch Docker QA stacks for `/qa-roam` and `/manual-qa`: `scripts/qa-stack.sh` (`up`/`port`/`status`/`exec-backend`/`psql`/`down`/`down-all`) brings up a `qa-<branch>` stack (nginx-served prod build + backend + Postgres) on an ephemeral port. Several `/qa-roam` and `/manual-qa` runs on different branches/worktrees now work in parallel without fighting over ports 3000/3001 or sharing the developer's local database (`docker-compose.qa.yml`, `backend/Dockerfile.qa`, `frontend/Dockerfile.qa`, `frontend/nginx.qa.conf`, `docs/qa-docker.md`)
- Budget mode for `/qa-roam` (`--budget 20%`, percent only): instead of a fixed 2–3 routes, the agent keeps roaming new scenarios until the run has consumed the given share of the real 5-hour subscription window. `scripts/qa-budget.mjs start/check` reads `rate_limits.five_hour` from the statusline stdin dump (`/tmp/statusline-debug.json`, overridable via `QA_STATUSLINE_DUMP`), baselines at run start and handles a window reset mid-run; missing/stale data yields a safe `stop` verdict
- Per-branch dev environment for parallel branch/worktree development: `scripts/dev-stack.sh` gives each branch a stable port slot (registry in the shared git dir; `web 3000+idx*10`, `api 3001+idx*10`, `db 15432+idx`) and its own Docker Postgres with `tutor_app` + `tutor_app_test` databases (`docker-compose.dev.yml`, `scripts/dev-db-init.sql`, `docs/dev-stack.md`). Wrapper commands (`run-backend`, `run-frontend`, `run-backend-e2e`, `test-backend`, `e2e`, `migrate`, `psql`) export `PORT`/`DATABASE_URL`/`FRONTEND_URL`/`REACT_APP_API_URL` over the personal `.env` (dotenv never overrides exported vars), so several branches run dev servers, jest and Playwright e2e side by side with fully isolated databases. `/auto-feature` mockup screenshots now use the branch's port instead of hardcoded :3000

### Changed
- `/qa-roam` and `/manual-qa` now boot an isolated Docker stack themselves instead of requiring manually-started dev servers; test-data prep runs inside the backend container (`qa-stack.sh exec-backend`) against the stack's fresh DB, so `db:seed` is safe again. New `--host` flag keeps the old behaviour (reuse running dev servers on `localhost:3000`), `--teardown` removes the stack after the run
- `frontend/playwright.config.ts` honours `E2E_BASE_URL`/`PORT` (defaults unchanged: `http://localhost:3000`), so e2e can target a branch's dev-stack ports
- Backend is now linted: ESLint 9 (flat config) with `typescript-eslint` scaffolding, an `npm run lint` script and a CI step. Enforced conventions: no `any` in production code (tests keep it — supertest/mock typings are `any` upstream), named exports only (the `lib/prisma` default export became `export const prisma`, 99 files updated), function expressions only, `type` + `import type`, no TS enums, and `max-lines` 150 for controllers (tests excluded). The 5 controllers over the limit (`auth`, `createLesson`, `getLessons`, `updateLesson`, `getStatistics`) were refactored: business logic moved into new `services/{auth,lessonCreation,lessonsQuery,lessonUpdate,statistics}` folders with unit tests, auth flow errors became typed `utils/errors.ts` classes. Along the way fixed 6 production `any`s, empty-object `Request<{}, {}, Dto>` generics, `Function` types and stale `@ts-ignore`s in tests. `docs/lint-roadmap.md` and `docs/conventions/backend.md` updated (e3678ec, 3c4c9be)

### Fixed
- WebSocket URLs were hardcoded to `ws://localhost:3001` — extracted `resolveWsUrl` (`@shared`, same-origin and scheme-aware ws/wss in production builds; dev URL derived from `REACT_APP_API_URL`) so realtime works behind the QA stack's nginx and against per-branch dev backends. Behaviour-neutral for the real (https) production deploy

### Infrastructure
- Added the `/auto-bug-fix` command — an end-to-end bug-fixing orchestrator adapted from `/auto-feature`: creates a worktree, reproduces the bug and finds the root cause (single human checkpoint), applies a minimal fix with a mandatory red-to-green regression test, runs the code-review loop (threshold 50, cap 3) and verifies the fix against the original reproduction steps. UI reproduction/verification runs on the branch's dev-stack ports (`scripts/dev-stack.sh`) instead of hardcoded :3000/:3001, so it works in parallel worktrees (1642d5a)

## 2026-09-05

### Changed
- Effector conventions are now actually ESLint-enforced via `eslint-plugin-effector` (pinned to 0.16.0 — newer versions require TypeScript 5): `$store`/`effectFx`/`Gate` naming plus bans on `.watch()`, `getState()`, `forward()`, `guard()` and `useStore` (`prefer-useUnit`). Production code had zero violations; 13 `unit.watch(fn)` calls in tests were rewritten to scope-bound `createWatch({ unit, fn, scope })`, which also stops watchers leaking between tests (eeca0d6)
- Inline styles are now ESLint-enforced too: `sx`/`style` props are banned (`react/forbid-component-props`, `react/forbid-dom-props`); the 4 existing `sx` usages (`EmailVerificationForm`, `LessonStatusIcons`, `StudentName`, `StudentArchivedInfo`) moved into styled components. Conventions docs and `docs/lint-roadmap.md` updated to match (eeca0d6)

## 2026-09-04

### Fixed
- Clearing the notes, homework or description field in the lesson edit form now actually deletes the text. Previously an emptied field was silently dropped from the update request and the old value stayed in the database — the note reappeared on the card after saving. Whitespace-only values are treated as empty too.
- The full-screen loading overlay no longer flashes during fast requests — it now appears only when a request stays pending longer than 300ms, and still disappears the moment the request finishes (6817840)
- Opening the app no longer stacks several dimmed loading screens on top of each other (dim getting darker, doubled spinners). Two causes fixed: the startup overlay was dropped before the boot data (students, upcoming lessons) actually loaded, and the lazy route chunk loader rendered its own second full-screen Backdrop on top of the request-blocking one. The app now waits for boot data before leaving the startup screen, and chunk loading goes through the same single overlay as API requests

### Added
- Lesson notes are now visible directly on the lesson card in the list — no need to open each lesson dialog to read them. A non-empty note shows as a compact 2-line snippet; if the text is truncated, a "Развернуть"/"Свернуть" control expands and collapses the full note in place (line breaks preserved) without opening the lesson view. Expand state is independent per card, the control has a touch-friendly hit area on mobile, long unbroken words/links wrap without breaking layout, and cards for lessons without a note look unchanged (no empty block). Works across all list views that use the lesson card, including the weekly list view.

### Changed
- Frontend ESLint now enforces six conventions previously left to review: named exports only (`import/no-default-export`), function expressions only (`func-style`), `type` over `interface` (`consistent-type-definitions`), `import type` for type-only imports (`consistent-type-imports`; `disallowTypeAnnotations: false` keeps the `vi.importActual<typeof import()>` test mocks working), string-literal unions instead of TS enums, and no `<form>` elements (`react/forbid-elements`). Autofixed 7 files to `import type` and removed a dead duplicate `plugins` key. Added `docs/lint-roadmap.md` tracking the staged adoption of the remaining lintable conventions.

## 2026-08-09

### Added
- MAX messenger is now available alongside WhatsApp and Telegram everywhere a contact method is chosen or shown — student and parent contact in the add/edit student form, the student card, and the student view dialog. Existing students are unaffected; the default for new students stays WhatsApp.
- Trial lessons without a student: the lesson form has a new "Пробный урок" toggle (with an info tooltip explaining it) that records a lesson for a prospective student by name only — no student card required. Optional phone and messenger, price defaults to 0 ₽, and the weekly-recurring option is hidden. Such lessons show in the calendar and list marked "Пробный", count toward the trial-lessons statistic while staying out of income, and can later be linked to a real student — linking clears the prospect data and preserves the lesson's original date, price and status.

### Fixed
- Opening the sidebar drawer no longer logs a React "unrecognized `$drawerWidth` prop" console error — the styled Drawer now filters transient `$`-props (found during manual QA of this feature).

## 2026-06-05

### Changed
- `/code-review-local` — added 3 recall angles ported from the `/code-review` (max effort) protocol: removed-behavior auditor, cross-file tracer, and wrapper/proxy correctness (5 → 8 parallel reviewer agents). Finding JSON schema unchanged, so the `/auto-feature` code-review loop stays compatible (frontmatter model also aligned to opus to match the body)

### Fixed
- Lessons page no longer strands you on an empty page after the last item leaves the current page (e.g. marking the only unsent homework on the last page as sent, marking the last unpaid lesson as paid, or deleting the last lesson on a page). The list now falls back to the last page that still has items instead of showing an empty "nothing left" state with the pagination control hidden. Applies to all paged tabs.
- Opening the user menu, the sidebar drawer, or a dialog no longer shifts or breaks the page layout. Removed MUI's modal scroll-lock, which mutated `<body>` (overflow + scrollbar-width padding) on every popup and reflowed the content.
- Unified the loading indicator: the lazy-route loader now uses the same full-screen overlay as the global blocking spinner, so startup no longer shows two different spinners at once.

## 2026-05-31

### Changed
- Unified student terminology in the UI from "студент" to "ученик" across the add/edit student dialog (title, name field label and placeholders) and the student create/update/delete error notifications

### Fixed
- Student form: submitting with an empty name now shows a clear "Имя ученика обязательно для заполнения" toast instead of silently doing nothing — the empty-name validation no longer calls an Effector unit from inside a pure `filter` (which threw `unit call from pure function` and swallowed the feedback)

### Tests
- E2E coverage expanded by ~28 Playwright journeys across auth, students, lessons, profile/finance, admin and news. Highlights: student-cabinet flows (invite registration, role-toggle login, email verification, own schedule, realtime WS updates, settings), recurring-lesson series delete / price-change / cascade time-shift, full reschedule apply, scheduling-conflict error, unpaid-lesson cancel, student unarchive/delete, profile name edit, logout dialog, tax-period edit, admin login rejection, news pagination, and manual DB backup (38a21ad, e7eb634, 0a23ad3, 35c939f, 87878d1)
- E2E test seams added to the `/api/__test__` router: direct student-user creation with verification state, admin token issuance, backup-file reset, and `archived` support on student seeding (c34e686, 38a21ad, e7eb634)
- `/e2e-hunt` coverage report capturing 25 prioritized user-journey gaps (c34e686)

## 2026-05-24

### Added
- `/auto-feature` slash command — sequential 7-phase orchestrator driving full feature development from a single user prompt: worktree → `/speckit.specify` (✋ checkpoint) → mockup React components in final FSD locations with `TODO(auto-feature)` markers + Playwright screenshots desktop/mobile/open-modals (✋ checkpoint) → `/speckit.clarify` + `/speckit.plan` + `/speckit.tasks` → `/speckit.implement` with Effector wiring + tests + lint + tsc + `/changelog` → code-review loop (cap 5 iterations, threshold 50, convergence detector, fixes applied in main agent) → `/manual-qa --fix` → final report with the QA remainder for the user. State persisted in `.claude/auto-feature/<slug>/state.json` with full resume support. All sub-agents on `opus` with explicit max-reasoning-effort instructions; no automatic git/PR operations (536b0bb)
- `/code-review-local` slash command — local-diff variant of the official PR `code-review` plugin: 5 parallel Sonnet reviewers (CLAUDE.md compliance, shallow bug scan, deep logic with context reads, security/data leakage, type/contract safety) + parallel Haiku scorers using the same 0/25/50/75/100 rubric. Dedupes findings across agents, sorts by score, configurable `--threshold` (default 50 vs plugin's hardcoded 80), works against `git diff <base-ref>...HEAD` instead of a PR. Structured JSON output to `docs/code-reviews/<branch>/iter-N.json` plus `--silent` mode (path-only stdout) for orchestrator consumption (536b0bb)
- `docs/improvement-reports/2026-05-24-improve-hunt.md` — improve-hunt report (10 high-impact candidates, all applied in this batch) (beaa058)
- Regression coverage for every fix: `backend/src/__tests__/trustProxy.test.ts`, `runBackupJob.test.ts`, `lessonStatusUpdater.test.ts` (select-only) and extended `validateEnv.test.ts`; frontend `error.helpers.test.ts`, `keyboard.helpers.test.ts`, plus a11y / memo / toast cases in `UserAvatar`, `LessonsMonth`, `LessonCard`, `tutor-student-invitation.model` tests (beaa058)

### Changed
- `/manual-qa` slash command — added a stable JSON findings index (`*.findings.json` written next to the MD report) so orchestrators can read coverage, severity counts, per-finding category/severity/screenshot paths, and autofix status programmatically. Final stdout message extended with the JSON path. Constraint added: `findings.json` is always written (even on zero findings) as a public contract (536b0bb)
- Lesson list visual identity: indigo/purple gradients on year / month headers and the AppHeader emoji shadow (`#667eea` / `#764ba2` / `#42a5f5` / `#7e57c2`) replaced with `theme.palette.primary` / `secondary` tokens — the list now matches the app's green palette and auto-adapts to theme changes (beaa058)

### Fixed
- Двойной клик по «Создать урок» больше не создаёт дубликат урока (та же защита для админ-логина) — `$lessonApiIsLoading` теперь считается через `combine(.pending)`, плюс фильтр на `formSubmitted`/`loginSubmitted` по `!pending`
- `GET /api/push/vapid-key` отдаёт `200 {vapidPublicKey: null, configured: false}` вместо `500`, когда VAPID не сконфигурирован — фронт корректно держит `$vapidKey = null` и не пытается подписаться
- Поле «Стоимость урока» в форме создания/редактирования урока автоматически заполняется из часовой ставки выбранного ученика (включая архивных), если поле пустое
- В диалоге удаления урока теперь выводятся дата и диапазон времени урока — учителю с пересекающимися занятиями проще не перепутать
- `/admin` под уже залогиненным учителем показывает понятный экран «Только для администраторов» с email и кнопкой «Назад на главную» вместо отдельной второй формы логина; кнопка «Войти» в админ-форме дизейблится во время сабмита
- `runBackupJob` now wraps its body in `try/catch` that logs `{ name, message, stack }` structured and re-throws — pg_dump / disk / Prisma failures previously surfaced in pm2 logs as `[object Object]` with no diagnostic context (beaa058)
- `validateRequiredEnv` extended to cover `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — server now refuses to start on a half-configured deploy instead of failing on the first registration / password-reset / push subscription (beaa058)
- Tutor invitation toasts: `Приглашение создано` / `Приглашение отозвано` now fire on `issueInvitationFx.done` / `revokeInvitationFx.done`, restoring success/error symmetry on slow connections (beaa058)

### Security
- nginx-aware `express-rate-limit`: backend now sets `app.set("trust proxy", 1)` so `req.ip` reflects the real client (X-Forwarded-For) instead of `127.0.0.1`. Login / forgot-password / admin-login / student-auth rate limits are no longer shared across the whole user base (beaa058)

### Performance
- `lessonStatusUpdater` cron (runs every minute): both `findMany` calls now `select: { id: true }` — Postgres no longer streams full Lesson rows (incl. `description`, `homework`, `notes`) just to read ids (beaa058)
- Lesson list re-renders: `LessonCard` and `LessonsDay` wrapped in `React.memo`; `useLessonMenu` and `useLessonsGrouping` memoize their callbacks via `useCallback`, so a single WebSocket lesson update no longer re-renders every card in the visible month (beaa058)

### Accessibility
- `LessonsYear`, `LessonsMonth` headers are now real keyboard buttons: `role="button"`, `tabIndex={0}`, `aria-expanded`, Russian `aria-label`, and Enter/Space activation via a shared `handleActivationKey` helper (beaa058)
- Dashboard quick actions migrated from clickable `Card` to `CardActionArea` with per-card `aria-label`, so keyboard / screen-reader users can reach Уроки / Ученики / Отчёты / Новый урок (beaa058)
- `UserAvatar` in the header (the only entry point into the profile menu) exposes `role="button"`, `tabIndex={0}`, `aria-label="Меню пользователя <name>"`, `aria-haspopup="menu"` and Enter/Space activation (beaa058)

### Refactor
- `shared/lib`: removed duplicated `extractAxiosErrorMessage` / `AxiosLikeError` / `axios-error.helpers.ts` / `axios-error.types.ts`. Single canonical `extractAxiosError(err, fallback)` lives in `error.helpers.ts`, deliberately ignores axios `.message` (English `"Network Error"`) and requires a Russian fallback. 7 model files migrated (beaa058)
- New shared helpers: `handleActivationKey` for keyboard activation on non-button elements (used by LessonsYear, LessonsMonth) (beaa058)

### Internal
- `/qa-roam` skill: убран жёсткий лимит «не более 5 пунктов» в отчёте — теперь записывается всё, что прошло фильтры Этапа 3, отсортированное по приоритету
- Новый отчёт QA Roam: `docs/qa-roam-reports/2026-05-24-qa-roam.md`

## 2026-05-22

### Added
- Student personal cabinet (MVP): tutor generates a one-shot invite link from the student card, student registers via `/student-invite/<token>` (full name + email + password), gets a separate `StudentUser` account isolated from the tutor `User`, and lands in their cabinet automatically authenticated (4b0480a)
- Unified `/login` page with a "Войти как: преподаватель / ученик" toggle — tutor flow keeps the existing `/api/auth/*`, student flow uses a new `/api/student-auth/*` namespace with its own JWT, rate limits and email-verification flow; `/admin/login` remains a separate page (4b0480a)
- Student cabinet sections: read-only weekly "Расписание" (lesson cards stripped of `price`, `isPaid`, `notes`, `homework`) and "Настройки" (student data + inviting tutor info); separate components from the tutor schedule to prevent leakage of tutor-only actions (4b0480a)
- Realtime updates for student schedule via a dedicated `/ws/student?token=<studentToken>` WebSocket path with `STUDENT_JWT_SECRET` and an isolated client pool inside the shared `WebSocketManager` — student receives create/update/delete/status-change/shift events without reload (4b0480a)
- Tutor's student card now shows "Ученик зарегистрирован" indicator with the registration date once the student signs up; the "Создать ссылку-приглашение" control is hidden afterwards, and regenerating the link invalidates any previous one immediately (4b0480a)
- E2E test drafts covering invite, login toggle, schedule, realtime sync, PWA and student settings journeys (1598a2e)

### Fixed
- Recurring lesson shift now broadcasts a student schedule event for every shifted lesson in the series — previously only the base lesson updated on the student cabinet, the rest stayed stale until reload
- Student email verification attempt counter is now incremented atomically via Prisma `increment` — closes a race where parallel wrong-code requests read the same snapshot and overwrote each other, bypassing the attempts limit
- `getCurrentStudentFx` registered with the global `$isBlocking` overlay so the initial student-cabinet load shows the loading state instead of a blank screen
- Hard-reload / deep-link inside `/student/cabinet/*` no longer kicks the student to `/login` — boot-orchestration moved into `appInitModel`, so the student-only path no longer triggers `initializeAppFx` (which would 401 on tutor endpoints and force-redirect via the tutor axios interceptor)
- `InvitationManager` disables "Создать ссылку-приглашение" / "Создать новую" for archived students with an inline warning instead of relying on a 409 from the backend after a click
- `DialogTitle` in `StudentViewDialog` no longer wraps a nested `<Typography variant="h6">` inside its `<h2>` — fixes a React DOM hydration warning
- `StudentViewDialog` now uses `dividers` on its content and a thin always-visible scrollbar so users on macOS understand the content can scroll
- `InstallPrompt` banner on 375px viewports — "Установить" button no longer gets clipped; text wrapper shrinks with `min-width: 0` while the button keeps its content-width via `flex-shrink: 0`
- PR #48 review feedback addressed across the cabinet flow (2b6a699)

### Removed
- Screen broadcast feature in full: `/screen` page with token UI, `ScreenshotMonitor` sidebar entry, frontend `screenApi` (`/screen/token`, `/screen/latest`) and Effector `screen.model`, backend `/api/screen/*` routes and controllers (`uploadScreen`, `getLatestScreen`, `getScreenToken`, HMAC token helpers), WebSocket `screen_updated` event with its frontend handler, and Mac capture tooling (`scripts/screen-capture.sh`, `scripts/com.kaluger.screen-capture.plist`)

### Infrastructure
- Prisma migration `029_student_cabinet`: new `student_users` and `student_invitations` tables; new `students.studentUserId` field linking the tutor-owned student card to the new student account (4b0480a)
- New env variable `STUDENT_JWT_SECRET`, distinct from `JWT_SECRET` and `ADMIN_JWT_SECRET` (4b0480a)

## 2026-05-10

### Fixed
- Race condition in `applyPasswordReset` — two concurrent requests with the same one-time token can no longer both apply a password change; the token's `usedAt` flip and password update now run inside `prisma.$transaction` with an atomic conditional `updateMany({ where: { id, usedAt: null } })`, so the second request fails with "ссылка уже использована"
- TOCTOU in `updateLesson` — scheduling-conflict check moved inside the same `prisma.$transaction` as the lesson update (and the recurring-shift conflict pre-check now runs through the transaction client), so a concurrent insert/update can no longer slip a conflicting lesson past validation
- Race condition in `processRecurringLessons` cron — added a module-level overlap guard (same pattern as `backupRunning`) and wrapped the conflict-check + `createMany` of every group inside `prisma.$transaction`, preventing duplicate weekly slots when the nightly tick overlaps with a manual trigger or process restart
- TOCTOU in `scheduleRemindersForLesson` — replaced the read-then-write idempotency guard with a partial unique index `(lessonId, intervalMinutes) WHERE status='PENDING'` plus per-row `create` with `P2002`-skip; concurrent calls (e.g. fast double-submit on lesson edit) can no longer deliver duplicate push notifications
- Silent loss in `processScheduledReminders` — added intermediate `PROCESSING` status and `claimedAt` field with a watchdog that reverts stale claims (>10 min) back to `PENDING`; if the Node process is killed between the claim transaction and the delivery loop, reminders are now recovered on the next tick instead of staying permanently in `SENT` without delivery
- Stale-response race in `lesson-cancellation` model on the frontend — `getCancellationInfoFx.done` samples now filter by matching the response `params` against the current `$cancellingLesson.id`; clicking «Отменить» on lesson A then quickly on B no longer reopens the confirm dialog with A's transfer info while $cancellingLesson is B
- Money/tax precision — `Lesson.price`, `Student.hourlyRate`, `TaxRatePeriod.rate` migrated from `Float` to `Decimal(10,2)` / `Decimal(5,2)`; `Prisma.Decimal.prototype.toJSON` overridden in `lib/prisma.ts` so `res.json` continues to emit `number`, preserving the API contract for the frontend
- Brute-force exposure on password-reset token — `passwordResetRateLimiter` (5 req / 15 min) is now also applied to `POST /api/auth/reset-password/verify` and `POST /api/auth/reset-password` (previously only `/forgot-password` was rate-limited)
- `backend/jest.config.js` typo `setupFilesAfterEach` → `setupFilesAfterEnv` — `setup.ts` was previously silently ignored by jest

### Changed
- Custom `Error` subclasses moved to `backend/src/utils/errors.ts` (`SchedulingConflictError`, `RecurringShiftConflictError`); local declarations inside controllers removed. `docs/conventions/backend.md` documents the rule.

### Performance
- **Backend tests 38s → 14–18s (-53..-62%)**: switched `ts-jest` preset to `@swc/jest` with `@swc-contrib/mut-cjs-exports@14.x` WASM plugin for `jest.spyOn` compatibility on CommonJS named exports; older `swc_mut_cjs_exports@10.7` is incompatible with `@swc/core@1.15`
- **Frontend setup time -31% (42s → 29s)**: removed unused MSW from `frontend/src/__tests__/setup.ts` (no test calls `server.use`; all API tests already use `vi.mock("@shared/api/base")`); added `deps.optimizer.web.include` for MUI / router / effector / date-fns to pre-bundle heavy modules (~-25% wall locally)
- **CI**: backend now matrix-sharded `[1,2]`, type-check moved to its own job, vitest blob reporter + merge-reports job, cache for `node_modules/.vite` and `@prisma/client`, `--maxWorkers=2` for 2-vCPU runners
- Frontend route-level code-splitting via `React.lazy` + `Suspense` for AdminPage, ReportsPage, ProfilePage, NewsPage, ScreenPage, Forgot/ResetPasswordPage, DashboardPage, LessonsPage, StudentsPage — initial bundle for `/login` no longer includes lesson/admin/reports code

### Added
- `docs/research/2026-05-10-test-speedup.md` — research report covering Phase 1+2 optimizations (this PR) and Phase 3 backlog (`@quramy/jest-prisma` transactions, vitest `--no-isolate` for Effector stores)
- `docs/improvement-reports/2026-05-10-improve-hunt.md` — improve-hunt report (10 candidates)

### Infrastructure
- Prisma migration `20260510173034_add_token_version_and_indexes` — adds `User.tokenVersion` column + `students.tutorId_archived` index (#2 + #4 from improve-hunt)
- Prisma migration `20260510182545_partial_unique_pending_reminders` — cleans up any existing duplicate PENDING reminders and creates the partial unique index used by the new scheduler idempotency contract
- Prisma migration `20260510182600_add_processing_reminder_status` + `20260510182700_add_reminder_claimed_at` — add `PROCESSING` enum value and nullable `claimedAt` column to `scheduled_reminders` for the crash-safe claim/finalize flow
- Prisma migration `20260510182800_money_to_decimal` — `ALTER COLUMN ... TYPE DECIMAL` for `lessons.price`, `students.hourlyRate`, `tax_rate_periods.rate`
- New bug-hunt report `docs/bug-reports/2026-05-10-bug-hunt.md` (10 candidates, 8 fixed in this batch; #1 and #4 deferred as a temporary feature, screen monitoring)

### Security
- JWT revocation on password/email change — added `User.tokenVersion` field, included in JWT payload by `login` and `verifyEmailChange`, verified by `authenticateToken` middleware against DB; `changePassword`, `verifyEmailChange`, and `applyPasswordReset` now increment `tokenVersion` to invalidate all previously issued tokens. A stolen JWT can no longer survive a password reset (improve-hunt #2)
- Rate limiting on sensitive auth/upload endpoints — `authRateLimiter` applied to `POST /api/auth/change-password` and `/change-email`; new `screenUploadRateLimiter` (60 req / min) on `POST /api/screen/upload` (improve-hunt #3)

### Refactor
- Removed `<form>` tags from `LoginForm`, `RegisterForm`, `LessonForm`, `StudentForm` per `docs/conventions/frontend.md`; submit via explicit `onClick` + `onKeyDown` Enter handler. `formSubmitted` Effector events changed to `createEvent()` without `FormEvent` payload
- Backend route files (`lessons.ts`, `students.ts`, `statistics.ts`, `news.ts`, `__test__.ts`) converted from `export default router` to `export const xxxRouter` for consistency with `auth.ts`, `push.ts`, etc.

### Added
- `/e2e-check` slash command — analyzes diff vs base ref, classifies user-facing changes as uncovered / possibly-affected / dead vs existing Playwright tests, optionally writes `*.draft.spec.ts` skeletons and a per-branch report under `docs/e2e-coverage/checks/` (4a045aa)
- `/e2e-hunt` slash command — runs parallel `feature-dev:code-explorer` subagents per app area (auth, students, lessons, profile, reports, admin, dashboard/news, pwa) to inventory user journeys, dedupes against existing tests, and produces a prioritized coverage gap report under `docs/e2e-coverage/` (4a045aa)
- `docs/conventions/e2e-testing.md` — full e2e conventions: when e2e is justified, two modes (functional vs `@visual`), required tag scheme (`@critical`/`@regression`/`@visual`/`@draft` + area tags), selector priority, page-object policy and tests-as-source-of-truth model for coverage tracking (4a045aa)
- `frontend/e2e/README.md` — quick-reference cheatsheet for the e2e folder (folder layout per area, run commands with `--grep` filters, selector rules, two-mode example) (4a045aa)

### Changed
- `docs/conventions/frontend-testing.md` — replaced the legacy "E2E — screenshot comparisons only, no other assertions" rule with a pointer to the new `e2e-testing.md` covering both functional user-journey and visual modes (4a045aa)
- `CLAUDE.md` — added `e2e-testing.md` to the mandatory pre-coding reading list and registered `/e2e-check` and `/e2e-hunt` in the Slash Commands section (4a045aa)



### Added
- Password recovery via email link: public `/forgot-password` page collects an email and dispatches a one-time SHA-256-hashed token (15-min TTL, single-use, cascade-on-user-delete); `/reset-password?token=...` validates the token on mount and lets the user set a new password (a7d3d54)
- Three new public auth endpoints: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/verify`, `POST /api/auth/reset-password` (a7d3d54)
- "Забыли пароль?" link added to the login form (in addition to the existing entry point inside the change-password dialog) (a7d3d54)
- Anti-abuse hardening: per-IP rate limiter (5 req / 15 min) on `/forgot-password`, 60-second per-email cooldown, automatic invalidation of older unused tokens on each new request, uniform anti-enumeration success response, automatic `isEmailVerified = true` on successful reset (a7d3d54)
- `sendPasswordResetEmail` template using the existing Resend infrastructure (a7d3d54)

### Changed
- `ResetPasswordForm` cancel button on the invalid-token state shortened from "Вернуться ко входу" to "Отмена" (743403a)

### Fixed
- New password-recovery effects (`forgotPasswordFx`, `verifyResetTokenFx`, `resetPasswordFx`) registered with the global `$isBlocking` overlay; per-component spinners removed to match the project's loading-UX convention (df5c2ca)
- `ResetPasswordForm` no longer re-fires `verifyResetTokenFx` on every keystroke: replaced `useEffect` with an Effector Gate that accepts the token as a prop. `ForgotPasswordFormGate.close → formReset` also clears stale success/error state on navigation (df5c2ca)

### Infrastructure
- Prisma migration `20260509190733_add_password_reset_tokens` adds the `password_reset_tokens` table with hashed-token unique index and `ON DELETE CASCADE` FK (a7d3d54)
- New env variable `FRONTEND_URL` documented in `backend/.env.example` — used to build the reset URL placed into outgoing email (a7d3d54)
- New `passwordResetRateLimiter` (5 req / 15 min, skipped in test env) wired in `middleware/rateLimit.ts` (a7d3d54)

## 2026-05-09

### Added
- Tax rate now lives as a chronological chain of periods (`TaxRatePeriod`) with start date + percent; tax amount on the reports page is computed per-payment using the rate active on each lesson's `paymentDate`
- New profile toggle "Учитывать налог" — disabled by default for all users; when off, no tax UI/calculation anywhere in the app
- Modal dialog "Налоговые ставки" for managing the period list (add/edit/delete) — atomic save/cancel, blocks deleting the last period while toggle is on
- Tax card on reports page now shows an info-icon with hover/click tooltip listing applicable rates and amounts (`X% × Y ₽ = Z ₽`), including a "вне настроенных периодов" row for payments before the earliest period (rate 0%)
- Backend REST endpoints `GET/POST/PATCH/DELETE /api/tax-periods` for CRUD over periods (validation: rate 0–100, unique `startDate` per user, Russian error messages)
- Backend `GET /api/statistics` now returns `taxAmount: number | null` and `taxBreakdown: TaxBreakdownEntry[] | null` (both null when toggle is off)

### Changed
- `User.taxRate` removed from schema and replaced by `User.taxEnabled` + relation to `TaxRatePeriod[]`; existing users with non-default tax rate (`!= 6.0`) get migrated to a single seed period spanning their full history with the toggle pre-enabled, others reset to off
- Tax card label adapts: single applicable rate → `Налоги (X%)`; multiple rates → neutral `Налоги` + info-icon
- Tax assignment per lesson is now driven by `paymentDate` (when the income was received) instead of `startTime`, matching how Russian tax law recognizes income on receipt

### Fixed
- Admin login compares password via bcrypt hash from `ADMIN_PASSWORD_HASH` instead of plain string equality with `ADMIN_PASSWORD` — eliminates plain-text storage and timing attack
- WebSocket reconnect for the same user no longer drops the new connection when the old socket's stale close handler fires later (live status updates are no longer silently lost after a reconnect)
- `JWT_SECRET` and `ADMIN_JWT_SECRET` are now mandatory — server throws at startup if either is missing, hardcoded fallback values removed from sources
- Auth endpoints (`/login`, `/register`, `/verify-email`, `/resend-verification`, `/admin/login`) now have rate limiting via `express-rate-limit` (skipped in test env)
- Email is normalized to lowercase on register, login, verify, resend-verification, and email-change flows — case-insensitive uniqueness, no more duplicate accounts
- `PUT /api/lessons/:id` payment transfer when cancelling a paid lesson runs inside `prisma.$transaction` (atomic — no double-paid state on partial failure)
- `lessonStatusUpdater` cron uses `updateMany` with status filter — manually cancelled lessons are no longer overwritten back to IN_PROGRESS/COMPLETED on the next tick
- `GET /api/lessons?page=abc` no longer collapses pagination to "return everything" — invalid page/limit fall back to defaults and limit is clamped to 100
- Lesson cancellation dialog cleanup checks lesson id — WebSocket-driven CANCELLED updates for unrelated lessons no longer wipe the active dialog state
- `LessonCell`, `StudentInfo`, `StudentCard`, `StudentSelector` no longer render an orphan `0` when price/hourlyRate equals 0
- Recurring lesson creation: scheduling-conflict check and `createMany` now run inside `prisma.$transaction` — double-clicks and HTTP retries no longer create duplicate lesson series
- Single-lesson creation: scheduling-conflict check and `create` also wrapped in `$transaction` for the same reason
- `GET/PUT /api/reminder-settings`: replaced `findUnique + create` with `upsert` — parallel first requests (multiple tabs on first sign-in) no longer surface a 500 from a P2002 unique-constraint race
- Lesson `price: 0` (free trial) is now preserved instead of being silently overwritten with `student.hourlyRate` (the `||` fallback treated 0 as falsy and inflated free lessons to full rate)
- WebSocketManager registers `close`/`error`/`message` handlers before sending the welcome message — if `ws.send` throws synchronously (socket closed during handshake) the entry no longer leaks in the connected-clients map
- All cron jobs (recurring lessons, lesson status updates, reminder processing, daily backup) now run with explicit `timezone: "Europe/Moscow"` instead of relying on the server's system clock — "daily at 2 AM" actually fires at 02:00 MSK
- Push reminders desync: server-side `enabled=false` is now written only on a successful browser unsubscribe (`unsubscribePushFx.done` instead of `.finally`); failures show a Russian error toast and leave the server state unchanged
- Weekly lessons view: day-grouping key now includes the year — lessons from different years that share the same day/month no longer collapse into one section
- Login/register navigation: redirect to `/` is now triggered only by a successful `loginFx`/`registerFx` for an already-verified user, not by every change to `userModel.$isAuthenticated` — email verification on `/verify-email` no longer side-effects a redirect through the login form model, and the home navigation no longer fires twice from two independent samples
- Reminder processor caps each tick at 100 pending reminders (oldest first) — recovering after server downtime no longer claims the entire backlog inside one transaction or floods the push provider in a single minute

### Infrastructure
- Prisma migration `20260509024056_tax_rate_periods` creates `tax_rate_periods` table with `(userId, startDate)` unique + index, adds `users.taxEnabled`, migrates legacy data, and drops `users.taxRate` in a single atomic step
- New script `npm run admin:hash-password -- <password>` to generate bcrypt hash for `ADMIN_PASSWORD_HASH`
- New dependency: `express-rate-limit`
- Test setup ensures `JWT_SECRET` / `ADMIN_JWT_SECRET` are present even without `.env.test`
- Test setup also defaults `RESEND_API_KEY` so suites that import the email service can run without a real key

## 2026-04-07

### Added
- Change password on profile page: verify current password, validate new password, update hash (664d6b6)
- Change email with two-step verification: enter new email + password, confirm with 6-digit code sent to new address (664d6b6)
- New JWT token issued after email change to reflect updated email in payload (664d6b6)
- 4 new API endpoints: `POST /api/auth/change-password`, `POST /api/auth/change-email`, `POST /api/auth/verify-email-change`, `POST /api/auth/resend-email-change-code` (664d6b6)
- Resend verification code with 60-second cooldown timer on frontend (664d6b6)

### Infrastructure
- Prisma migration adding `pendingEmail` field to users table (664d6b6)
- 54 new tests: 35 backend (service + controller integration) and 19 frontend (Effector model) (664d6b6)

## 2026-04-06

### Added
- Reports page: new "Поступления за период" card showing total sum and count of payments received within the selected date filter (aggregated by `paymentDate`, independent of lesson `startTime`)
- Backend `GET /api/statistics` now returns `paymentsInRangeSum` and `paymentsInRangeCount`
- Lessons page: new "Все" tab appears when payment date filter is active, showing lessons of all statuses at once. Filter auto-switches to this tab on activation and reverts to "Запланированные" on clear
- Lessons page: payments summary bar above the list ("Оплачено за период: {сумма}, {N} уроков") when payment date filter is active, aggregated across all pages via new `paymentsSummary` field on `GET /api/lessons`

## 2026-03-30

### Added
- Payment date filter on lessons page — filter by date range with presets: current month, last month, current week (2559796)
- Payment date range filter in backend `getLessons` controller with validation (2559796)
- Timezone-aware statistics: all date range queries use user's timezone from `X-Timezone` header for correct month/day boundaries (2559796)

### Changed
- Statistics endpoints (`getStatistics`, `getLessonStats`, `getStudentStats`) now accept and use `X-Timezone` header for default date ranges (3da5fc1)
- Weekly lesson view sends `weekStart` as ISO string preserving user's local midnight (3da5fc1)

## 2026-03-16

### Added
- PWA support: app installable as standalone with proper manifest, iOS meta-tags, and service worker for push events and offline caching (1cfdb6a)
- Push notification reminders before lessons with configurable intervals (5, 10, 15, 30, 60 min) (1cfdb6a)
- "Do not disturb during lesson" setting — suppresses reminders when another lesson is in progress (1cfdb6a)
- Reminder settings UI in profile page with toggle, interval chips, and mute option (1cfdb6a)
- Push subscription management: subscribe, unsubscribe, list devices (1cfdb6a)
- Offline indicator snackbar when network connection is lost (1cfdb6a)
- Backend cron job to process scheduled reminders every minute with atomic claim to prevent duplicates (1cfdb6a)
- Automatic reminder scheduling/cancellation when lessons are created, updated, or rescheduled (1cfdb6a)

### Fixed
- Security: push subscription endpoint ownership check to prevent subscription takeover (c29f1b9)
- App stuck on loading spinner when initialization fails — now sets `$appInitialized = true` on error (c29f1b9)
- Push subscription not revoked when user disables reminders (c29f1b9)
- Failed push delivery now marks reminder as `FAILED` instead of retrying indefinitely (c29f1b9)
- Reminders for shifted recurring lessons now recalculated after time change (59a49a2)
- Recurring lesson reminder query scoped to exact created startTimes to avoid duplicates (59a49a2)
- Old push subscription cleaned up from backend database when re-subscribing (59a49a2)
- Reminder cancel+recreate wrapped in `prisma.$transaction` to prevent race conditions (59a49a2)
- Flaky `createLesson` test — increased conflict weeks from 13 to 14 to cover 3-month boundary (7c3b1d5)

### Infrastructure
- Added `PushSubscription`, `ReminderSettings`, and `ScheduledReminder` Prisma models with migrations (1cfdb6a)
- Added `web-push` npm dependency for VAPID-based push notifications (1cfdb6a)
- Added `FAILED` status to `ReminderStatus` enum (c29f1b9)
- Removed `backend/dist/` from git tracking (abe86e9)

## 2026-02-24

### Added
- Tutor landing page at `teacher.kaluger.ru` — single-page static site built with Next.js and Tailwind CSS v4
- Hero section with tutor name, tagline, about text, experience badge, and CTA button
- Education section with timeline-style layout showing degrees and institutions
- Certificates section with responsive grid cards and image support
- Lesson conditions section with subject cards displaying levels, duration, and pricing
- Reviews section with star ratings, text truncation with "read more", and "show more" pagination
- Contacts section with social links: Профи.ру, VK, WhatsApp, Telegram, Max (custom SVG icons for Профи.ру and Max)
- Sticky header with responsive navigation and mobile hamburger menu
- Scroll-triggered fade-in animations via custom `useInView` hook (Intersection Observer API)
- Full SEO metadata: Open Graph, canonical URL, robots, sitemap.xml
- Static export to `out/` directory for Nginx serving
- Comprehensive test suite: 66 tests covering all components, hooks, and icons

### Infrastructure
- Added `landing/` project to CI pipeline (lint, type check, tests, build)
- Added landing build and deploy steps to deploy workflow (rsync `out/` to VPS)
- Created Nginx server block config for `teacher.kaluger.ru` with SSL, caching, and gzip

## 2026-02-22

### Added
- News section with paginated list, styled cards, and empty state (3ae41dd)
- Unread news badge indicator in sidebar with dot badge on the news icon (3ae41dd)
- Backend API endpoints for news: `GET /api/news`, `GET /api/news/has-unread`, `POST /api/news/mark-read` (3ae41dd)
- `/news` slash command to generate user-friendly Russian news entries from CHANGELOG.md (3ae41dd)
- Auto-sync of news entries to production database during deployment via JSON seed files (3ae41dd)

### Infrastructure
- Added `NewsItem` and `NewsReadStatus` Prisma models with migration (3ae41dd)
- Added `node dist/scripts/syncNews.js` step to deploy pipeline (3ae41dd)

## 2026-02-21

### Added
- Configurable tax rate in user profile with validation (0–100%, default 6%) (5ec8609)
- Tax amount card on financial statistics dashboard showing calculated tax for the selected period (5ec8609)
- Server-side tax calculation in statistics endpoint: `taxAmount = Math.round(earnings * taxRate / 100)` (5ec8609)
- Prisma migration adding `taxRate` field to users table (5ec8609)
- `UpdateProfileDto` type for partial profile updates (5ec8609)
- Unit tests for tax rate validation, tax amount calculation, and UI components (5ec8609)

### Fixed
- Profile page save button incorrectly enabled when no changes were made due to missing `taxRate` in test mock (5609dd2)
