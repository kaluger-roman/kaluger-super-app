# Implementation Plan: Видеозвонок, который переживает сворачивание приложения

**Branch**: `039-video-call-background` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/039-video-call-background/spec.md`

## Summary

Звонки фичи 030 держатся на открытом экране: закрытие сокета сразу завершает звонок, адресат без сокета сразу «пропущенный», звук собеседника играет через `<video>`, который iOS ставит на паузу. План:

1. Сервер: транспорт сообщает сервису звонков `participantConnected/Disconnected`; потеря соединения запускает период ожидания 3 мин вместо завершения. Новые доменные сообщения протокола: `presence_update` → `call_state` (снимок звонка), `call_resume`, `call_peer_presence`, `call_peer_resumed`, причина `peer_not_returned`. Проба живости держателя соединения и передача звонка ожидающему окну.
2. Клиент: звонок не завершается при потере сокета; при возврате быстрый реконнект, проверка живости по ответу `call_state`, `call_resume`, ICE restart (инициатор — всегда звонящий), пересборка `RTCPeerConnection` при холодном старте, повторное получение остановленных треков с сохранением ручных выключений. Звук собеседника — отдельный `<audio>`, одна плашка «Нажмите, чтобы продолжить звонок».
3. Присутствие и медиа: клиент сообщает «на экране / в фоне» и фактическую приостановку звука/видео (по возможностям платформы и `muted` треков); подписи по ролям (FR-032/FR-033) уже есть в хелперах макетов.
4. Push о входящем: абстракция канала доставки (`services/callNotification`, канал `WEB_PUSH`), подписки получают тип канала и владельца-ученика, настройка преподавателя «Уведомления о входящих звонках», замена уведомления по тегу при отмене/ответе, обработка нажатия в SW без перезагрузки открытого приложения.
5. Ученик включает уведомления в кабинете и настройках; выход из аккаунта удаляет подписку устройства и завершает звонок.
6. Единая точка входа звонка на фронте (`callEntry.model`) для будущей нативной оболочки (PR #95).
7. Подключение 21 маркера `TODO(auto-feature)` макетов к реальным моделям, удаление моков и временного маршрута `/__mockups/call-background`.
8. P3: картинка в картинке как изолированное прогрессивное улучшение с проверкой на устройствах.

Решения и обоснования — [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20; `frontend/public/push-sw.js` — ES5 JavaScript (как сейчас)
**Primary Dependencies**: Frontend — React, Effector, patronum, effector-react, MUI (styled API), browser WebRTC, Push API, Service Worker. Backend — Express, Prisma, `ws`, `web-push` (уже есть). Новых npm-зависимостей нет
**Storage**: PostgreSQL через Prisma: enum `PushChannel`, в `push_subscriptions` — `channel`, `studentUserId`, `userId` необязательный + CHECK одного владельца; в `reminder_settings` — `callNotificationsEnabled`. Состояние присутствия и ожидания — в памяти процесса (как `liveCalls`). На устройстве — два флага в `localStorage`
**Testing**: Backend — Jest + Supertest + тестовая БД, `jest.useFakeTimers` для ожидания/таймаутов, `jest.mock("web-push")`, мок `lib/wsManager` где нужно. Frontend — Vitest + RTL + MSW, модели через `fork`, `setWebRtcAdapter` для WebRTC, `node:vm` для `push-sw.js`. E2E — Playwright (Chromium, fake media)
**Target Platform**: iPhone iOS 16.4+ (PWA на экране «Домой» для push), Android Chrome, настольные браузеры
**Project Type**: Web (frontend FSD + backend layered MVC)
**Performance Goals**: статус прерывания у собеседника ≤5 с; звук и видео после возврата ≤5 с (SC-002); push на экране ≤5 с (SC-004); от нажатия до экрана входящего ≤5 с (SC-005). Таймауты: ожидание 180 с, вызов 40 с (без изменений), проба держателя 5 с, ответ `call_state` 3 с, ICE `disconnected` → restart 3 с
**Constraints**: iOS глушит микрофон/камеру веб-приложения в фоне (обходится только нативом, PR #95) — честные индикаторы; каждый push обязан показать уведомление (iOS отзывает подписку); без кнопок в уведомлении; FR-027…FR-031 — ничего браузерного в серверной логике и протоколе
**Scale/Scope**: 1:1 звонки, один процесс бэкенда; 1 миграция, 2 REST-маршрута ученика + поле настроек, 5 новых типов сообщений + 1 причина, ~8 новых фронтовых моделей, 21 маркер макетов

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип / конвенция | Соответствие |
|---------------------|--------------|
| I. FSD | PASS. Звонок — `features/videoCall`; подписка ученика — `features/callNotifications`; настройка преподавателя — `entities/notifications` + `features/notificationSettings`; оркестрация выхода — `features/logoutConfirmation`; связи с сокетами, видимостью и SW — `app/model` и `App.tsx`. Импорты вниз; кросс-фичевые импорты только как уже принято (`lessons → videoCall`). `npm run find-cycle` чистый |
| II. Layered MVC | PASS. `routes/studentPush.ts → controllers/studentPush/* → prisma`; общая валидация `controllers/push/validators.ts`; логика звонка в `services/callSignaling/*`, доставка в `services/callNotification/*`, web-push интеграция в `lib/webPush.ts`. Транспорт (`lib/websocket`) только вызывает `participantConnected/Disconnected` |
| III. Effector | PASS. Только `sample`/`useUnit`, чистые `fn` (сложные — в `*.helpers.ts`), модели разбиты на `model/types/helpers/constants` файлы и <200 строк (`call.model.ts` уже ~200 — новые юниты только в новых моделях), таймеры — patronum `delay`/`interval` со счётчиком поколения. Без `useEffect` для загрузки данных: кабинет — `CabinetGate`, настройки — существующие `loadSettings`. Глобальные DOM-слушатели (`visibilitychange`, SW `message`) — в `App.tsx`, как существующие |
| IV. Type safety | PASS. `type`, `import type`, без `any`; протокол типизирован в `backend/src/types/call.ts` и `frontend/.../signaling.types.ts`; Prisma-типы для подписок |
| V. Consistency | PASS. Именованные экспорты, function expressions, `index.ts`, нет inline-стилей, тексты на русском, «преподаватель» в UI (имя PWA «Репетитор» в manifest не трогаем — issue #122). Нет `<form>` |
| VI. Testing | PASS. Каждой новой модели/хелперу/сервису — тесты; backend integration на маршруты и сценарии сигналинга, cross-role security для `/api/student-push`; регрессионные тесты на изменённое поведение (закрытие сокета больше не завершает звонок, `failed` в `active` не завершает звонок); e2e journeys R14 |
| VII. Simplicity | PASS с обоснованием: абстракция канала доставки и тип канала — явные требования FR-028/FR-029 (Complexity Tracking). Нет feature-флагов; PiP — изолированная фаза |
| backend.md: ошибки | Новые классы ошибок (если понадобятся, напр. `CallResumeAuthorizationError`) — только в `src/utils/errors.ts`; повторная авторизация переиспользует `CallAuthorizationError` |
| backend.md: сервисы | Новые сервисы в подпапках с `*.constants/helpers/types.ts`; `pushNotification.ts` (плоский) при выносе web-push в `lib/webPush.ts` остаётся тонким — перевод в папку оппортунистически не требуется |
| backend-testing.md | Реестры в памяти (`presence`, таймеры) получают `__reset…ForTests` и вызываются из `src/__tests__/setup.ts`; `uniqueEmail()`; без моков Prisma |
| frontend-testing.md | Тест-швы (адаптер WebRTC, сброс реестров; элемент `<audio>` — через `fork` со значением `$peerAudioElement`) — в `features/videoCall/testSeams.helpers.ts`; `createWatch` вместо `.watch`; fire-and-forget для `delay` |
| Prisma | Миграция `039_call_background_push`; на ветке свой `npm ci` в `backend/` до `prisma generate` |

**Initial gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/039-video-call-background/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── signaling-ws.md
│   ├── push-api.md
│   ├── call-notification-push.md
│   └── frontend-call-entry.md
├── checklists/requirements.md
└── tasks.md            # /speckit.tasks
```

### Source Code

```text
backend/
├─ prisma/schema.prisma                         # PushChannel, PushSubscription, ReminderSettings
├─ prisma/migrations/<ts>_039_call_background_push/
├─ src/types/call.ts, push.ts                   # новые сообщения, payload звонков
├─ src/lib/webPush.ts                           # NEW: VAPID + sendWebPush + удаление устаревших
├─ src/lib/websocket/
│  ├─ webSocketManager.ts                       # connected/disconnected вместо terminate; проба держателя
│  ├─ connection.constants.ts                   # HOLDER_GONE_CLOSE_CODE, HOLDER_PROBE_TIMEOUT_MS
│  ├─ waitingSockets.ts, connection.helpers.ts
│  └─ signaling.constants.ts, signaling.helpers.ts  # парсинг presence_update, call_resume
├─ src/services/callSignaling/
│  ├─ callFlow.ts                               # ringCallee с push, закрывающие push, peer_not_returned
│  ├─ callReconnect.ts                          # NEW: participantConnected/Disconnected, ожидание, call_resume
│  ├─ callPresence.ts                           # NEW: реестр присутствия, relay, call_state снимок
│  ├─ callSignaling.ts / .types.ts / .constants.ts / .helpers.ts
│  └─ index.ts
├─ src/services/callNotification/               # NEW: канал доставки (FR-028)
│  ├─ index.ts, callNotification.types.ts, .constants.ts, .helpers.ts
│  └─ webPushChannel.ts
├─ src/services/callRecord/                     # endedAt в CreateCallRecordArgs
├─ src/services/pushNotification.ts             # на lib/webPush
├─ src/controllers/push/validators.ts           # NEW: общий валидатор подписки
├─ src/controllers/studentPush/                 # NEW: subscribe, unsubscribe
├─ src/controllers/reminderSettings/*           # callNotificationsEnabled
├─ src/routes/studentPush.ts, testSupport.ts, index.ts (регистрация)
└─ src/utils/errors.ts                          # только если нужен новый класс

frontend/
├─ public/push-sw.js                            # incoming/missed/closed, клик без перезагрузки
├─ src/app/App.tsx                              # видимость → presence, SW message
├─ src/app/model/                               # appInit (SW для ученика, visibility), socketConnection/socketReconnect (быстрый реконнект, 4004, transportStale, waiting при звонке)
├─ src/shared/api/studentPush.ts (+ types)      # NEW
├─ src/entities/notifications/                  # callNotificationsEnabled, правила подписки преподавателя
├─ src/features/videoCall/
│  ├─ model/callEntry.model.ts                  # NEW (вместо callRequest.model.ts)
│  ├─ model/callPresence.model.ts (+helpers/types/constants)   # NEW
│  ├─ model/callResume.model.ts (+helpers)      # NEW
│  ├─ model/mediaRecovery.model.ts (+helpers)   # NEW
│  ├─ model/peerAudio.model.ts, peerAudio.helpers.ts            # NEW
│  ├─ model/backgroundHint.model.ts             # NEW
│  ├─ model/callNotificationOpen.model.ts       # NEW
│  ├─ model/signaling.*, signalRouting.*, callSignals.model.ts, peerConnection.*, negotiation.model.ts, webrtc.helpers.ts, toasts.model.ts, call.constants.ts
│  ├─ ui/PeerAudio/                             # NEW
│  ├─ ui/VideoTile/*, ui/ActiveCallScreen/*, ui/BackgroundAudioHint/*, ui/IncomingCallModal/*
│  ├─ ui/callBackgroundMock.*                   # DELETE
│  └─ videoCall.types.ts, videoCall.helpers.ts, testSeams.helpers.ts
├─ src/features/callNotifications/              # model/ NEW; ui wiring; callNotificationsMock.* DELETE
├─ src/features/notificationSettings/ui/CallNotificationSettings/
├─ src/features/logoutConfirmation/models/sessionCleanup.model.ts   # NEW
├─ src/widgets/studentSidebar/StudentSidebar.tsx  # выход через sessionCleanup
├─ src/pages/mockups/                           # DELETE
├─ src/app/components/AppRoutes/AppRoutes.tsx, AppRoutes.constants.ts  # убрать маршрут макетов
└─ e2e/students/video-call-background.spec.ts, e2e/helpers/*    # NEW
```

**Structure Decision**: существующий монорепо; новое — подпапки сервисов и новые модели в существующих фичах; отдельная фича только для логики ученика `callNotifications` (UI уже там).

## Design notes

### Backend

- `ringCallee` (R9): порядок — busy-проверка → устройства → `startCall` → `call_incoming` по сокету (если есть) → push (если нет видимого окна) → `call_ringing` звонящему. Если сокета нет, а доставлено 0 — снять звонок как `offline`. Отправка push не блокирует `call_ringing`: ожидание результата только в ветке «сокета нет».
- `removeCall` для каждого исхода с `pushNotified` вызывает `notifyCallClosed` (`missed_call` при отмене/таймауте, `call_closed` при ответе/отказе). При `markAccepted` с `pushNotified` — тоже `call_closed` (уберёт уведомление на других устройствах адресата).
- `participantDisconnected`: `ringing`-адресат без устройств → прежний `terminateActiveCallForParticipant`; иначе `disconnectedAt`, таймер, `call_peer_presence(disconnected)`, `releaseWaitingSockets(kind, id, HOLDER_GONE)`. Таймер: `removeCall`, `call_ended(peer_not_returned)` собеседнику, запись по `resolveDropOutcome` с `endedAt`.
- `participantConnected`: запись присутствия; звонок не трогается до `call_resume`.
- `WebSocketManager.handleConnection/handleStudentConnection`: убрать `terminateActiveCallForParticipant` при замене; `release` → `participantDisconnected`; после `set` → `participantConnected`; при `wait` → `probeHolder(previous)`.
- Лимиты: сообщения нового типа проходят тот же `maxPayload`; `presence_update` идёт через `routeCallMessage` (тип в `CALL_SIGNAL_TYPES`), не через эхо `handleMessage`.

### Frontend

- `signalRouting.model` разделяет новые типы; `canTakeIncoming` игнорирует `call_incoming` для текущего `callId`.
- `callSignals.model`: удалить `transportDisconnected → callConnectionLost` для идущего звонка; `TRANSPORT_LOST_TEXT` и связанный тост удалить (заменены баннером и локальным пределом ожидания).
- `peerConnection.model`: `failed` → `callFailed` только в `connecting`; в `active` — событие для `mediaRecovery.model`. Сессия хранит `polite`, по нему решается инициатор ICE restart.
- `webrtc.helpers`: `restartSessionPeer(callId)` — новое `RTCPeerConnection` с теми же треками, новый удалённый поток.
- `CallVideo`: удалённое видео всегда `muted`; `usePeerSoundPlayback` (мок) удаляется в пользу `peerAudio.model.$peerAudioBlocked`.
- Счётчик длительности при холодном старте — от `connectedAt`.

### Подключение макетов (21 маркер `TODO(auto-feature)`)

| Файл | Маркер → реальное |
|------|-------------------|
| `app/components/AppRoutes/AppRoutes.tsx`, `AppRoutes.constants.ts` | удалить маршрут `/__mockups/call-background` и lazy-импорт |
| `pages/mockups/**` | удалить папку целиком |
| `features/videoCall/ui/callBackgroundMock.{constants,helpers,types}.ts` | удалить |
| `features/callNotifications/callNotificationsMock.{constants,helpers}.ts` | удалить |
| `ActiveCallScreen.tsx` | `callPresenceModel.$shownPeerPresence` |
| `BackgroundAudioHint.tsx` (2) | `backgroundHintModel.$isBackgroundHintShown`, `backgroundHintDismissed` |
| `VideoTile.hooks.ts` `usePeerSoundPlayback` | `peerAudioModel.$peerAudioBlocked` + `continueCallClicked`; хук удалить |
| `call.constants.ts` (3) | тосты в `toasts.model`: `callEnded("peer_not_returned")`, `callResumeModel.returnedToEndedCall`, `callNotificationOpenModel.staleCallNotificationOpened` |
| `CallNotificationsCard.tsx` (3) | `callNotificationsModel.$status`, `$isInviteDismissed` + `inviteDismissed`, `enableClicked` |
| `CallNotificationsSection.tsx` (2) | `callNotificationsModel.$status`, `toggled` |
| `CallNotificationSettings.tsx` | `notificationsModel.$callNotificationsEnabled` + `callNotificationsToggled`; скрыть, если ключи VAPID не настроены |

Финальная проверка: `grep -rn "TODO(auto-feature)" frontend/src` по файлам 039 пуст; `docs/mockups/039-video-call-background/index.md` остаётся как документация макетов (скриншоты не коммитятся).

## Risks

| Риск | Смягчение |
|------|-----------|
| `<audio>` с `MediaStream` в фоне iOS может всё равно остановиться | best-effort + `audioSession`, одна плашка на возврате; фиксируется в ручном QA (SC-003) |
| iOS оставляет «открытый» сокет после сна | проверка живости по ответу `call_state` (3 с) → переподключение |
| Push-сервис задерживает доставку | `TTL 40`, `topic`, `urgency high`; клиентская проверка `call_state` → «Звонок уже завершён» |
| Гонки переговоров при restart | инициатор ICE restart фиксирован (звонящий), rollback зависшего offer |
| E2E push в Chromium без настоящего push-сервиса | test-sink эндпоинт на бэкенде вместо реальной доставки |
| `call.model.ts` у предела 200 строк | новые юниты только в новых моделях |

## Complexity Tracking

| Отступление | Зачем | Почему проще не подходит |
|-------------|-------|--------------------------|
| Абстракция канала доставки при единственном канале (VII: «no premature abstractions») | Явное требование FR-028 и PR #95: APNs VoIP/FCM добавляются без изменения логики звонка | Прямой вызов web-push из `callFlow` пришлось бы переписывать при добавлении натива |
| Поле `channel` с одним значением enum | FR-029: устройства натива в той же модели без переделки записей | Добавление позже потребовало бы миграции существующих строк и изменения выборок |
