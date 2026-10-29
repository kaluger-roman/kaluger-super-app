# Manual QA Report — 039-video-call-background — 2026-10-29

**Feature:** 039-video-call-background — Видеозвонок, который переживает сворачивание приложения
**Spec:** [`specs/039-video-call-background/spec.md`](../../specs/039-video-call-background/spec.md)
**Quickstart:** [`specs/039-video-call-background/quickstart.md`](../../specs/039-video-call-background/quickstart.md)
**Base URL:** http://localhost:32770, после пересборки с автофиксом http://localhost:32771 (изолированный QA-стек `qa-039-video-call-background`, prod-сборка) и http://localhost:3150 (API http://localhost:3151: бэкенд в режиме `NODE_ENV=test E2E=1` на локальной БД `tutor_qa_039`, нужен для test-support маршрутов: приёмник push и обрыв сокета)
**Прогон выполнен:** 2026-10-29 11:20–11:50 UTC
**Автофикс:** включён

## Резюме

Прогнаны все P1-сценарии US1–US3, P2-сценарии US4–US5 и основные edge cases в headless Chromium на home: преподаватель на компьютере и на эмулированном iPhone, ученик на эмулированных iPhone (Safari, не PWA) и Android, камера и микрофон подменены canvas/WebAudio, сворачивание эмулировано через `document.visibilityState` + `visibilitychange`, потеря связи через закрытие сокета и `/api/__test__/ws/.../drop`, push через приёмник e2e-бэкенда. Удержание звонка, статусы по ролям (FR-032/FR-033), ожидание 3 минуты, восстановление после перезагрузки и в ожидающей вкладке, push о входящем/пропущенном/закрытом вызове, открытие по уведомлению и включение уведомлений учеником работают по спеке.

Блокирующая проблема одна, но критичная: отдельный `<audio>` для голоса собеседника (FR-009) в Chromium не воспроизводит звук вообще (`readyState` 0, `play()` не завершается), а все `<video>` звонка без звука, так что в Chrome собеседники не слышат друг друга; из-за этого же после перезагрузки плашка «Нажмите, чтобы продолжить звонок» не исчезает после нажатия (#1). Остальное мелкое.

## Оценка готовности

- **Статус до автофикса:** 🔴 не готово (Critical #1). **После автофикса:** 🟡 требует доработки (остались Low-находки и проверки на реальных устройствах, см. «Автофикс» и «Нужна проверка на реальных устройствах»)
- **Соответствие спеке:** 26 из 35 сценариев пройдено, 4 провалено, 5 с замечаниями
- **Найдено проблем:** Critical 1 / High 0 / Medium 0 / Low 4
- **Топ-3 риска перед мержем:**
  1. Голос собеседника не играет в Chrome/Chromium (desktop и Android), см. #1
  2. Ручное «микрофон выключен» скрыто янтарной плашкой «приостановлен — свернул приложение» на iPhone, см. #2
  3. Тесты и e2e не ловят #1: проверяют `paused`, а не `readyState`; звук нужно проверить ушами на реальных устройствах (quickstart №1–2)

## Покрытие сценариев

| # | Сценарий | Приоритет | Результат | Заметки |
|---|---|---|---|---|
| P1.1 | US1-AS1: ученик (iPhone) свернул → у преподавателя «Ученик свернул приложение» ≤5 с | P1 | ✅ pass | 24 мс, [05](./2026-10-29-039-video-call-background/screenshots/05-tutor-sees-student-minimized-iphone.png) |
| P1.2 | US1-AS2: преподаватель (iPhone) свернул → ученик видит только «Восстанавливаем связь…» / «Звук временно недоступен» | P1 | ✅ pass | слов «свернул» нет, [17](./2026-10-29-039-video-call-background/screenshots/17-student-sees-tutor-iphone-background.png) |
| P1.3 | US1-AS3 / US2-AS5: возврат → подписи пропадают ≤3–5 с, видео идёт | P1 | ✅ pass | 9 и 15 мс, [07](./2026-10-29-039-video-call-background/screenshots/07-tutor-after-student-returned.png) |
| P1.4 | US1-AS4: сокет ученика закрыт / оборван сервером → «Восстанавливаем связь…» у обоих, сам переподключается | P1 | ✅ pass | 0,3 с до статуса, ~5 с до восстановления, [14](./2026-10-29-039-video-call-background/screenshots/14-tutor-student-connection-lost.png) |
| P1.5 | US1-AS5 / FR-005: не вернулся 3 мин → «Собеседник не вернулся в звонок», у вернувшегося «Звонок завершён», в истории длительность до обрыва | P1 | ✅ pass | тост на 180,8 с, в истории 0:52 вместо 3:45, [15](./2026-10-29-039-video-call-background/screenshots/15-tutor-toast-peer-not-returned.png), [16](./2026-10-29-039-video-call-background/screenshots/16-tutor-call-history.png) |
| P1.6 | US1-AS6: собеседник завершил во время ожидания → вернувшийся видит «Звонок завершён» | P1 | ✅ pass | [19](./2026-10-29-039-video-call-background/screenshots/19-student-returned-after-tutor-hangup.png) |
| P1.7 | US1-AS7: выключенные вручную микрофон и камера остаются выключенными после возврата | P1 | ⚠️ warn | состояние сохраняется; индикатор у преподавателя — см. #2 (оставлено по решению владельца) |
| P1.8 | Холодный старт: перезагрузка страницы ученика в звонке → звонок восстановлен | P1 | ❌ fail | звонок восстановлен за 1,6 с, но плашка «Нажмите, чтобы продолжить звонок» не уходит после нажатия, см. #1 |
| P1.9 | FR-008: ожидающая вкладка сама забирает звонок, когда вкладка-держатель закрыта | P1 | ✅ pass | 0,5 с, [37](./2026-10-29-039-video-call-background/screenshots/37-student-waiting-tab-auto-takeover.png) |
| P1.10 | US2-AS1: Android свернул → «Ученик свернул приложение», индикатора микрофона нет | P1 | ✅ pass | [25](./2026-10-29-039-video-call-background/screenshots/25-tutor-sees-android-student-minimized.png) |
| P1.11 | US2-AS2: iPhone свернул → «Микрофон ученика приостановлен — ученик свернул приложение» (и в режиме «Во весь экран») | P1 | ✅ pass | [06](./2026-10-29-039-video-call-background/screenshots/06-tutor-fullscreen-student-minimized.png) |
| P1.12 | US2-AS3 / FR-012: подсказка на iPhone один раз, закрытие запоминается; на Android не показывается | P1 | ✅ pass | [04](./2026-10-29-039-video-call-background/screenshots/04-student-active-call-iphone-hint.png) |
| P1.13 | US2-AS4: «Нажмите, чтобы продолжить звонок» — одно нажатие возобновляет звук и видео | P1 | ❌ fail | см. #1, [13](./2026-10-29-039-video-call-background/screenshots/13-student-after-continue-click.png) |
| P1.14 | FR-009: голос собеседника играет через отдельный `<audio>` | P1 | ❌ fail | Critical #1 |
| P1.15 | FR-033: преподаватель на компьютере свернул вкладку → у ученика статусов нет | P1 | ✅ pass | видео и звук на десктопе в фоне идут |
| P1.16 | US3-AS1 / FR-019: адресат без открытого приложения, есть подписка → push ≤5 с, у звонящего «Вызываем…» | P1 | ✅ pass | `TTL: 40`, `Urgency: high`, `Topic` 32 символа, [22](./2026-10-29-039-video-call-background/screenshots/22-tutor-calling-student-app-closed.png) |
| P1.17 | US3-AS2/AS3: открытие `?call=<id>` во время вызова → экран входящего, «Принять» соединяет; параметр убирается из URL | P1 | ✅ pass | [23](./2026-10-29-039-video-call-background/screenshots/23-student-opened-from-push.png), [24](./2026-10-29-039-video-call-background/screenshots/24-student-accepted-from-push.png) |
| P1.18 | US3-AS4 / FR-016: отмена вызова → `missed_call` «Пропущенный звонок от Анна Сергеевна», тот же tag/topic | P1 | ✅ pass | `TTL: 86400`, url `/student/cabinet/calls` |
| P1.19 | US3-AS5 / FR-017: открытие по уведомлению завершённого вызова → «Звонок уже завершён» (ученик и преподаватель) | P1 | ✅ pass | [26](./2026-10-29-039-video-call-background/screenshots/26-student-stale-push-call-already-ended.png), [33](./2026-10-29-039-video-call-background/screenshots/33-tutor-stale-push-call-already-ended.png) |
| P1.20 | US3-AS6 / FR-014: нет подписки и приложения → «Ученик сейчас не в сети» | P1 | ✅ pass | [31](./2026-10-29-039-video-call-background/screenshots/31-tutor-student-offline-no-subscription.png) |
| P1.21 | US3-AS7 / FR-018: приложение на экране → push нет; в фоне → и экран входящего, и push | P1 | ✅ pass | счётчик приёмника 4→4 и 4→5 |
| P1.22 | US3-AS8: ответ на одном устройстве → `call_closed` на остальные | P1 | ✅ pass | проверено по приёмнику; показ/скрытие системного уведомления — только на устройстве |
| P2.1 | US4-AS1: карточка «Включите уведомления…» с «Включить» (Android) | P2 | ✅ pass | [27](./2026-10-29-039-video-call-background/screenshots/27-student-android-invite-card.png) |
| P2.2 | US4-AS2: «Включить» → карточка пропала, в настройках «Уведомления о звонках: включены» | P2 | ✅ pass | подписка `WEB_PUSH` ученика в БД, [30](./2026-10-29-039-video-call-background/screenshots/30-student-settings-on.png) |
| P2.3 | US4-AS3: запрет → справка, переключатель заблокирован, диалог не повторяется | P2 | ✅ pass | [28](./2026-10-29-039-video-call-background/screenshots/28-student-notifications-denied.png), [29](./2026-10-29-039-video-call-background/screenshots/29-student-settings-denied.png) |
| P2.4 | US4-AS4: iPhone Safari вне PWA → инструкция «Поделиться → На экран «Домой»…» | P2 | ✅ pass (после решения владельца) | было: рядом старый баннер установки, см. #4, [01](./2026-10-29-039-video-call-background/screenshots/01-student-cabinet-iphone-safari.png); после исправления одна инструкция, [43](./2026-10-29-039-video-call-background/screenshots/43-after-decision-student-cabinet-iphone-one-hint.png) |
| P2.5 | US4-AS6 / FR-024: выход ученика удаляет подписку устройства | P2 | ✅ pass | `DELETE /api/student-push/unsubscribe` 200, записи в БД нет |
| P2.6 | US5-AS1/AS2 / FR-021: переключатель преподавателя; выкл → «Преподаватель сейчас не в сети»; правила подписки устройства | P2 | ✅ pass | [32](./2026-10-29-039-video-call-background/screenshots/32-student-calls-tutor-notifications-off.png), [38](./2026-10-29-039-video-call-background/screenshots/38-tutor-call-notifications-on.png); невалидное значение → 400 с русским текстом |
| P2.7 | FR-025: ключи VAPID не заданы (пустые переменные окружения) → уведомления скрыты | P2 | ❌ fail | см. #3, [39](./2026-10-29-039-video-call-background/screenshots/39-tutor-settings-no-vapid.png), [40](./2026-10-29-039-video-call-background/screenshots/40-student-settings-no-vapid.png) |
| P2.8 | Преподаватель включает звонки, браузер запретил уведомления | P2 | ✅ pass (после решения владельца) | было: только тост, см. #5; теперь в карточке «Звонки» справка, как разрешить, [46](./2026-10-29-039-video-call-background/screenshots/46-after-decision-tutor-calls-denied-help.png) |
| P3.1 | US6 / FR-026: PiP | P3 | ⚠️ warn | у видео собеседника `disablePictureInPicture=false`; в Chromium нет `autoPictureInPicture`, проверка только на устройстве |
| E1 | Адресат потерял связь во время «Входящего вызова», есть подписка → вызов идёт, push уходит, «Принять» соединяет | Edge | ✅ pass | — |
| E2 | Выход из аккаунта в другой вкладке во время звонка → звонок завершается сразу | Edge | ✅ pass | у преподавателя «Собеседник завершил звонок» за 0,3 с |
| E3 | Второе устройство в состоянии «Приложение открыто в другой вкладке…» после закрытия держателя | Edge | ⚠️ warn | само не забирает (не «ожидающее» окно), одно нажатие «Использовать здесь» восстанавливает звонок за 0,6 с, [35](./2026-10-29-039-video-call-background/screenshots/35-student-other-device-took-over-call.png) |
| E4 | Звонок без push-ключей и с ними, звонки в открытом приложении — регресс фичи 030 | Smoke | ✅ pass | вызов, ответ, отказ («Вызов отклонён»), отмена, завершение |

Не покрыто в эмуляции (нужны реальные устройства, см. ниже): демонстрация экрана с телефона и сворачивание (US1-AS8), смена сети Wi‑Fi ↔ мобильная, ICE restart при обрыве медиа, «Микрофон занят другим приложением», системные уведомления и `notificationclick` service worker, звук в фоне на iPhone/Android, оба участника свёрнуты одновременно, «Собеседник занят».

## Артефакты прогона

- QA-стек: `qa-039-video-call-background` (web http://localhost:32770). `npm run db:seed` в стеке не работает (нет `prisma/seed.ts`), данные засеяны скриптом через Prisma: преподаватель `tutor-mqa@qa.local`, ученики `Иван Петров [mqa 2026-10-29]` (`ivan-mqa@qa.local`) и `Мария Смирнова [mqa 2026-10-29]` (`maria-mqa@qa.local`), пароль у всех `QaPass!2026`, по уроку физики на сегодня.
- E2E-режим: бэкенд :3151 (`NODE_ENV=test E2E=1`, тестовая пара VAPID из `~/e2e-039-push.sh`), фронт :3150 (`npm start`), БД `tutor_qa_039` на локальном Postgres home, те же аккаунты. Скрипт запуска `~/qa039/stack.sh` на home. Подписки-приёмники: `push-sink/ivan1`, `push-sink/tutor1`, `push-sink/tutordev`.
- Эмуляция: камера — canvas, микрофон — WebAudio-осциллятор (init-скрипт подменяет `getUserMedia`), iPhone/Android — UA + `isMobile`, push-подписка ученика/преподавателя — подменённый `PushManager` с ключами P-256, как в `frontend/e2e/helpers/sink-push-manager.ts`.

---

## Находки

### 1. Голос собеседника не воспроизводится в Chromium: `<audio>` получает пустой поток и не подхватывает добавленные позже треки

- **Категория:** 🐛 Bug
- **Severity:** Critical
- **Сценарий:** P1.8, P1.13, P1.14
- **Файл/место:** `frontend/src/features/videoCall/model/peerAudio.helpers.ts:20` (`syncPeerAudioStream`), `peerAudio.model.ts:41-47`
- **Однозначность исправления:** да

#### Шаги
1. Преподаватель звонит ученику, ученик принимает, медиа соединилось.
2. В консоли любой стороны: `document.querySelector('audio').readyState`.
3. Ученик перезагружает страницу в звонке, нажимает «Нажмите, чтобы продолжить звонок».

#### Ожидание (FR-009, US2-AS4)
Голос собеседника играет через отдельный `<audio>`; одно нажатие на плашку возобновляет звук и видео, плашка пропадает.

#### Реальность
У `<audio data-testid="peer-audio">` на обеих сторонах `readyState = 0`, `paused = false`, промис `play()` не завершается никогда; `<video>` звонка все `muted`, то есть звука собеседника нет совсем. После перезагрузки плашка «Нажмите, чтобы продолжить звонок» остаётся на экране после нажатия (ждёт завершения `play()`).

Причина: удалённый `MediaStream` создаётся пустым при создании `RTCPeerConnection` (`peerSession.helpers.ts:52`, `webrtc.helpers.ts:86`), `syncPeerAudioStream` при `$remoteStream.updates` делает из него пустой аудиопоток, `playPeerAudio` ставит его в `srcObject`, а пришедший позже трек добавляется в тот же объект через `addTrack` (`remoteTrackAdded`). Chromium не начинает воспроизведение медиаэлемента, если поток был пустым при назначении `srcObject` и трек добавлен позже. Проверено в странице: пустой `MediaStream` → `srcObject` → `play()` → `addTrack(осциллятор)` даёт `readyState 0` и вечный `play()`; тот же поток, назначенный заново (`srcObject = null; srcObject = s`), сразу даёт `readyState 4` и звук. Для `<video>` Chromium добавленный трек подхватывает, поэтому видео видно, а звук нет.

#### Скриншоты
![Плашка осталась после нажатия](./2026-10-29-039-video-call-background/screenshots/13-student-after-continue-click.png)

#### Console / Network
```
audio: { readyState: 0, paused: false, tracks: [audio live muted=false] }, play() → pending (3 с)
после srcObject = null; srcObject = s → play() resolved, readyState 4
```

#### Предлагаемое исправление
В `syncPeerAudioStream` при появлении нового аудиотрека возвращать новый `MediaStream` (прежние треки + новый), а не дописывать трек в уже назначенный объект: `$peerAudioStream` обновится, `playPeerAudio` назначит `srcObject` заново, и элемент начнёт играть. Тест модели, который закреплял «тот же объект», поправить; регрессия — «трек, пришедший позже, ставится на элемент новым потоком».

---

### 2. При вручную выключенном микрофоне свернувшийся ученик на iPhone показывается как «Микрофон ученика приостановлен — ученик свернул приложение»

- **Категория:** ❌ Spec mismatch
- **Severity:** Low
- **Сценарий:** P1.7
- **Файл/место:** `frontend/src/features/videoCall/model/peerView.helpers.ts:23` (`getPeerAudioNotice`), `ui/VideoTile/VideoTile.tsx:31`; флаг `audioSuspended` считается в `callPresence.helpers.ts:36` без учёта ручного выключения
- **Однозначность исправления:** нет

#### Шаги
1. Звонок преподаватель (компьютер) ↔ ученик (iPhone).
2. Ученик выключает микрофон и камеру кнопками, затем сворачивает приложение.

#### Ожидание (FR-011)
Отдельный индикатор приостановленного звука — только если микрофон приостановила система, «ручное выключение микрофона показывается как раньше».

#### Реальность
Красный значок «микрофон выключен» заменяется янтарной плашкой «Микрофон ученика приостановлен — ученик свернул приложение». После возврата микрофон остаётся выключенным (это верно, FR-007), но преподаватель ждал, что звук вернётся сам. Аналогично ученик увидит «Звук временно недоступен» о преподавателе, который сам выключил микрофон.

#### Скриншоты
![](./2026-10-29-039-video-call-background/screenshots/08-tutor-student-minimized-with-mic-off.png)

#### Предлагаемое исправление
Не показывать `getPeerAudioNotice`, если `peerMediaState.micOn === false` (показывать прежний значок). В макете сказано, что янтарная плашка «заменяет» красный значок, поэтому нужно решение владельца, какой индикатор важнее, когда выполнены оба условия.

---

### 3. Уведомления о звонках предлагаются, когда на сервере ключи VAPID заданы пустыми

- **Категория:** 🐛 Bug
- **Severity:** Low
- **Сценарий:** P2.7
- **Файл/место:** `frontend/src/entities/notifications/notifications.model.ts:55-57` (`loadVapidKeyFx` берёт `vapidPublicKey` и игнорирует `configured`); бэкенд `backend/src/controllers/push/getVapidKey.ts` отдаёт `""` при пустой переменной (`?? null`)
- **Однозначность исправления:** да

#### Шаги
1. Запустить бэкенд с `VAPID_PUBLIC_KEY=` и `VAPID_PRIVATE_KEY=` (пустые строки, как бывает при `KEY=` в `.env`).
2. `GET /api/push/vapid-key` → `{"vapidPublicKey":"","configured":false}`.
3. Открыть настройки уведомлений преподавателя и кабинет/настройки ученика.

#### Ожидание (FR-025)
Подписка и уведомления о звонках скрыты, ошибок нет.

#### Реальность
У преподавателя видна карточка «Звонки» с переключателем, у ученика карточка «Включите уведомления…» с «Включить» и раздел «Уведомления о звонках: выключены» с переключателем. Сервер при этом push не шлёт (`isWebPushConfigured()` трактует `""` как «не настроено», звонок даёт «Ученик сейчас не в сети»), а подписка с пустым ключом упадёт в `pushManager.subscribe`.

#### Скриншоты
![](./2026-10-29-039-video-call-background/screenshots/39-tutor-settings-no-vapid.png)
![](./2026-10-29-039-video-call-background/screenshots/40-student-settings-no-vapid.png)

#### Предлагаемое исправление
`loadVapidKeyFx` возвращает ключ только при `configured && vapidPublicKey`, иначе `null` (поле `configured` уже есть в контракте ответа).

---

### 4. На iPhone в Safari в кабинете ученика две подсказки об установке на экран «Домой»

- **Категория:** ⚠️ UX issue
- **Severity:** Low
- **Сценарий:** P2.4
- **Файл/место:** новая карточка `features/callNotifications/ui/CallNotificationsCard` и прежний баннер установки PWA (фича 008) внизу экрана
- **Однозначность исправления:** нет

#### Шаги
1. Открыть кабинет ученика в iPhone Safari (не PWA).

#### Ожидание
Одна понятная инструкция по установке.

#### Реальность
Сверху карточка 039 «На iPhone уведомления приходят только в приложение, установленное на экран «Домой». Поделиться → На экран «Домой»…», снизу старый баннер «Установите приложение для push-уведомлений. Нажмите → «На экран Домой»». Тексты почти одинаковые, на 390 px вдвоём занимают треть экрана.

#### Скриншоты
![](./2026-10-29-039-video-call-background/screenshots/01-student-cabinet-iphone-safari.png)

#### Предлагаемое исправление
Скрывать старый баннер в кабинете ученика, пока показывается карточка 039 (или наоборот). Решение за владельцем.

---

### 5. Преподавателю при запрещённых уведомлениях не объясняют, как их разрешить

- **Категория:** 💡 Improvement
- **Severity:** Low
- **Сценарий:** P2.8
- **Файл/место:** `frontend/src/features/notificationSettings/ui/CallNotificationSettings/CallNotificationSettings.tsx`
- **Однозначность исправления:** нет

#### Шаги
1. Браузер преподавателя запретил уведомления (headless Chromium запрещает по умолчанию).
2. Настройки → Уведомления → включить «Уведомления о входящих звонках».

#### Ожидание
Как у ученика (US4-AS3): понятно, что уведомления запрещены, и как их разрешить.

#### Реальность
Переключатель остаётся выключенным, тост «Не удалось подписаться на уведомления». Повторное нажатие даёт тот же тост.

#### Скриншоты
![](./2026-10-29-039-video-call-background/screenshots/21-tutor-toggle-call-notifications-headless.png)

#### Предлагаемое исправление
Переиспользовать `PermissionDeniedHelp` из `features/callNotifications` в карточке «Звонки», когда `Notification.permission === "denied"`. Новая поверхность, нужно решение владельца.

---

## Решения владельца по оставшимся находкам

QA-стек пересобран с изменениями: http://localhost:32772 (порт сменился при пересборке, прежний :32771 больше не отвечает), аккаунты те же. Проверено в headless Chromium (Playwright MCP).

- #4 — исправлено. Старый баннер установки PWA прячется, пока кабинет ученика сам показывает инструкцию установки: карточка-приглашение на расписании (пока не закрыта) или раздел «Уведомления» в настройках. Условие в модели: `callNotificationsModel.$isInstallInstructionShown` (гейты `InviteCardGate` и `SettingsSectionGate` монтируют карточка и раздел), баннер берёт `appInitModel.$isIosInstallHintVisible`. Вживую на эмулированном iPhone Safari: на расписании и в настройках одна инструкция, старого баннера нет ([43](./2026-10-29-039-video-call-background/screenshots/43-after-decision-student-cabinet-iphone-one-hint.png), [45](./2026-10-29-039-video-call-background/screenshots/45-after-decision-settings-iphone-one-hint.png)); после «Скрыть» на карточке старый баннер возвращается на расписании ([44](./2026-10-29-039-video-call-background/screenshots/44-after-decision-card-closed-banner-back.png)); вне кабинета (страница входа) баннер показывается, как раньше.
- #5 — исправлено. `PermissionDeniedHelp` перенесён в `shared/ui` и показывается в карточке «Звонки» преподавателя, когда уведомления запрещены (`notificationsModel.$isPushPermissionDenied`). Разрешение перечитывается после неудачной подписки и при возврате в приложение (раньше `$pushPermission` читалось только при загрузке страницы). Вживую: запрет в браузере, нажатие на переключатель → справка появилась ([46](./2026-10-29-039-video-call-background/screenshots/46-after-decision-tutor-calls-denied-help.png)); после перезагрузки с запретом справка видна сразу; после разрешения и возврата на вкладку справка пропала. Тост «Не удалось подписаться на уведомления» остался; рядом, в карточке «Напоминания об уроках», теперь в том же сеансе появляется и прежнее предупреждение «Уведомления заблокированы…» с устаревшим текстом для iOS — заведено отдельной задачей.
- #2 — оставлено как есть по решению владельца: янтарная плашка заменяет красный значок и при ручном выключении микрофона, как в макете. Решение записано в `specs/039-video-call-background/research.md` (R4).

Проверки: `npm run check -- --full --backend-tests npm` — все 8 проверок зелёные (первый прогон: 1 падение `signalRouting.model.test.ts` «should ask the server about a stale call_accepted instead of starting media» под нагрузкой; с теми же seed'ами и отдельно не воспроизводится, повторный прогон зелёный), `npm run find-cycle` — циклов нет.

## Нужна проверка на реальных устройствах (T086, T093)

- iPhone (PWA с экрана «Домой», iOS 16.4+): свернуть на 1–2 мин в звонке → у преподавателя за ≤5 с «Ученик свернул приложение» и «Микрофон ученика приостановлен…»; после возврата звук и видео в обе стороны за ≤5 с; играет ли голос преподавателя, пока приложение свёрнуто (SC-003, `navigator.audioSession`).
- Android Chrome: свернуть в звонке → звук в обе стороны не прерывается, плашки микрофона нет; слышно ли собеседника вообще (после исправления #1).
- Голос собеседника на компьютере (Chrome, Safari, Firefox) после исправления #1, включая перезагрузку страницы в звонке и плашку «Нажмите, чтобы продолжить звонок».
- Заблокировать экран на 4 мин → «Собеседник не вернулся в звонок» у ожидающего, «Звонок завершён» у вернувшегося.
- Сменить Wi‑Fi → мобильная в фоне → звонок восстановился без нового вызова (ICE restart, FR-008a).
- Выгрузить PWA из памяти во время звонка, открыть снова → звонок восстановлен (может понадобиться «Нажмите, чтобы продолжить звонок»).
- Системное уведомление о входящем на заблокированном экране iPhone и Android за ≤5 с; нажатие → экран входящего за ≤5 с; отмена → уведомление заменилось на «Пропущенный звонок от …»; ответ на втором устройстве → уведомление убрано.
- Демонстрация экрана с телефона и сворачивание (US1-AS8); «Микрофон занят другим приложением» после входящего звонка по телефону.
- PiP (US6, T086): Android Chrome и iPhone PWA — плавающее окно с видео собеседника при сворачивании; если не появляется или ломает звук — откатить T084/T085.

## Автофикс

**Исправлено:** 2 находки (#1, #3)
**Изменённые файлы:**
- frontend/src/features/videoCall/model/peerAudio.helpers.ts
- frontend/src/entities/notifications/notifications.helpers.ts
- frontend/src/entities/notifications/notifications.model.ts

**Добавленные и изменённые тесты:**
- frontend/src/features/videoCall/model/__tests__/peerAudio.model.test.ts — регрессия на #1: «should put a voice that arrives after the element got its stream on it as a new stream (regression)», «should keep the stream when no new voice arrived»; тест «should play the peer's audio tracks alone, also those that arrive later» теперь ждёт новый поток; поддельный `<audio>` ставит `paused` при смене `srcObject`, как браузер. Без исправления два теста падают (проверено).
- frontend/src/entities/notifications/__tests__/notifications.model.test.ts — регрессия на #3: «should keep $vapidKey null when the backend sends an empty key with VAPID not configured (regression)»
- frontend/src/entities/notifications/__tests__/notifications.helpers.test.ts — `toVapidKey`

### Исправлено
- #1 — `syncPeerAudioStream` отдаёт новый `MediaStream`, когда приходит новый аудиотрек, и прежний, когда новых нет; `<audio>` получает поток заново и начинает играть. Проверено вживую (E2E-стек :3150 и пересобранный QA-стек :32771): `readyState 4`, `play()` завершается у обеих сторон в новом звонке и после перезагрузки страницы ученика; после перезагрузки звук стартует сам, плашка «Нажмите, чтобы продолжить звонок» не появляется ([41](./2026-10-29-039-video-call-background/screenshots/41-after-fix-student-reload-audio-plays.png)). Ветка «браузер запретил автозапуск → нажатие» в headless Chromium не воспроизвелась (элемент `autoPlay` стартует сам), её покрывают тесты `peerAudio.model` («should start the sound inside the tap and stop asking») и проверка на устройстве.
- #3 — `loadVapidKeyFx` берёт ключ через `toVapidKey`: только при `configured && vapidPublicKey`. Проверено вживую с пустыми `VAPID_*`: у преподавателя карточки «Звонки» нет, у ученика нет карточки-приглашения, в настройках «На этом устройстве уведомления недоступны» ([42](./2026-10-29-039-video-call-background/screenshots/42-after-fix-student-settings-no-vapid.png)).

### Проверки
`npm run check -- --full --backend-tests npm` из корня worktree: tsc, eslint, prettier фронта и бэка, полные vitest и jest — все зелёные (230 с).

### Не исправлено автофиксом (нужен ручной разбор)
- #2 — однозначность «нет»: макет прямо говорит, что янтарная плашка заменяет красный значок, нужно решение владельца.
- #4 — однозначность «нет»: какой из двух баннеров установки оставлять, решает владелец.
- #5 — однозначность «нет»: новая поверхность (справка о запрете в настройках преподавателя).

После ревью diff'а: commit отдельным коммитом с префиксом `fix(qa): ...`.
