# Data Model: 039 — видеозвонок переживает сворачивание приложения

## 1. PostgreSQL (Prisma) — одна миграция `039_call_background_push`

### Enum `PushChannel` (новый, FR-029)

| Значение | Смысл |
|----------|-------|
| `WEB_PUSH` | Web Push (VAPID) — браузер и PWA. Единственный канал в этой фиче |

Нативные каналы (`APNS_VOIP`, `FCM`, PR #95) добавляются новыми значениями enum; существующие записи не меняются.

### `PushSubscription` (`push_subscriptions`) — расширение

| Поле | Тип | Изменение | Правило |
|------|-----|-----------|---------|
| `id` | String cuid | — | |
| `channel` | `PushChannel` | новое, `@default(WEB_PUSH)` | существующие строки получают `WEB_PUSH` |
| `endpoint` | String `@unique` | — | адрес доставки канала |
| `p256dh`, `auth` | String | — | ключи web-push (обязательны для `WEB_PUSH`) |
| `deviceName` | String? | — | ≤100 символов |
| `userId` | String? | было обязательным → необязательное | FK `users`, `onDelete: Cascade` — владелец-преподаватель |
| `studentUserId` | String? | новое | FK `student_users`, `onDelete: Cascade` — владелец-ученик |
| `createdAt` | DateTime | — | время последней регистрации устройства: повторная отправка подписки (`POST …/subscribe`) обновляет его |

Индексы: `@@index([userId])` (есть), `@@index([studentUserId])` (новый).
Ограничение (raw SQL в миграции): `CHECK (("userId" IS NULL) <> ("studentUserId" IS NULL))` — ровно один владелец.
Связь: `StudentUser.pushSubscriptions PushSubscription[]`.

Не больше `MAX_PUSH_SUBSCRIPTIONS_PER_OWNER = 10` подписок на владельца (`services/pushSubscription`), см. contracts/push-api.md, «Не больше 10 устройств на владельца».

Назначение по владельцу: подписки преподавателя — напоминания (как сейчас, выборка `where: { userId }`) и звонки; подписки ученика — только звонки (FR-022).

### `ReminderSettings` (`reminder_settings`) — расширение

| Поле | Тип | Правило |
|------|-----|---------|
| `callNotificationsEnabled` | Boolean `@default(true)` | FR-021. Нет строки настроек → считается `true`. Не влияет на `enabled` (напоминания) |

`GET/PUT /api/reminder-settings` возвращают и принимают поле (см. contracts/push-api.md).

### `CallRecord` — без изменений схемы

`CreateCallRecordArgs` получает необязательный `endedAt?: Date`: при завершении по истечению ожидания передаётся `disconnectedAt` не вернувшегося участника, длительность считается до него (уточнение 2026-10-27). Без поля — как сейчас (`now`).

## 2. Память сервера

### `LiveCall` (`services/callSignaling/callSignaling.types.ts`) — расширение

| Поле | Тип | Смысл |
|------|-----|-------|
| `disconnectedAt` | `Partial<Record<CallerKindValue, Date>>` | участник потерял соединение в этот момент; нет ключа — на связи |
| `disconnectedTabId` | `Partial<Record<CallerKindValue, string>>` | `tab` страницы, чьё соединение держало звонок при потере: пока звонок ждёт, только её `resume=1` забирает соединение у другой живой вкладки (нет ключа — страница без `tab`, любая); снимается вместе с `disconnectedAt` |
| `graceTimers` | `Partial<Record<CallerKindValue, Timeout>>` | таймер `CALL_RECONNECT_GRACE_MS` (180 000) на участника |
| `pendingPeerRestart` | `Partial<Record<CallerKindValue, object \| null>>` | собеседник пересобрал соединение (`call_resume { sessionRestart: true }`), а доставка просьбы о пересборке участнику не подтверждена: значение — сокет, в который она записана (`null` — соединения не было). Снимается любым сигналом участника по этому сокету; `call_resume` участника по другому сокету получает `call_peer_resumed { sessionRestart: true }` (contracts/signaling-ws.md, `call_resume` п. 5) |
| `pushNotified` | boolean | адресату ушёл push о входящем (нужен для закрывающего push, FR-016) |
| `incomingPush` | `Promise<number>?` | исход push о входящем: на сколько устройств доставлен; ставится при первой отправке, следующие запросы (уход адресата в фон, потеря связи) повторно не шлют, а берут этот исход; закрывающий push ждёт его завершения |
| `answeringEndpoint` | `string?` | `pushEndpoint` из `call_accept`/`call_reject` адресата звонящего вызова: этому устройству закрывающий `call_closed` не отправляется (contracts/call-notification-push.md) |

Все таймеры снимаются в `removeCall` и `__resetLiveCallsForTests`.

### Реестр присутствия (`services/callSignaling/callPresence.ts`, новый)

`Map<"kind:id", ParticipantPresence>`, записи нет — участник считается `on_screen` с флагами `false`; запись создаётся и обновляется `presence_update`, удаляется в `participantDisconnected`/`participantRevoked`. Замена сокета той же вкладки запись не трогает. `__resetPresenceForTests` вызывается из `src/__tests__/setup.ts`.

```ts
type PresenceState = "on_screen" | "background";
type PeerPresence = PresenceState | "disconnected";
type ParticipantPresence = { presence: PresenceState; audioSuspended: boolean; videoSuspended: boolean };
```

Видимое окно для FR-013/FR-018 = есть зарегистрированное соединение и его присутствие `on_screen`.

### Переходы участника звонка

```text
on_screen ⇄ background            (presence_update; собеседнику call_peer_presence)
on_screen|background → disconnected (participantDisconnected; таймер ожидания; собеседнику presence "disconnected")
disconnected → on_screen|background (call_resume; таймер снят; собеседнику call_peer_resumed + presence)
disconnected → [звонок завершён]   (таймер истёк: собеседнику call_ended "peer_not_returned")
```

### Переходы звонка (дополнения к 030)

```text
ringing  + адресат без видимого окна и есть устройства → ringing (push отправлен, pushNotified)
ringing  + адресат без соединения и без доставленных push → снят: call_unavailable звонящему, MISSED
ringing  + адресат отключился, устройства есть → ringing (push, если ещё не было)
ringing  + адресат отключился, устройств нет → снят: call_unavailable, MISSED (как сейчас)
ringing  + звонящий отключился → ringing до ответа/таймаута
accepted|connected + участник отключился → тот же статус, ожидание 3 мин
любой    + таймер ожидания истёк → снят: call_ended("peer_not_returned") собеседнику, запись по resolveDropOutcome с endedAt = disconnectedAt
любой    + снят при pushNotified → notifyCallClosed адресату (missed | answered_elsewhere)
accepted (из ringing) при pushNotified → notifyCallClosed(answered_elsewhere)
```

Если оба участника отключились — звонок завершается по первому истёкшему таймеру; `removeCall` идемпотентен, запись создаётся один раз.

## 3. Фронтенд (Effector)

### `features/videoCall`

| Модель | Сторы / события | Источник |
|--------|-----------------|----------|
| `callEntry.model` (вместо `callRequest.model`) | `startRequested`, `answerRequested`, `rejectRequested`, `resumeRequested` | FR-031 |
| `callPresence.model` | `$peerPresence: PeerPresenceState` (сброс на новый звонок/завершение), `$selfPresence`, `visibilityChanged(boolean)`, `transportReady(CallRole)`, `peerPresenceReceived` | R4 |
| `callResume.model` | `callStateReceived`, `resumeDue` (→ `call_resume`), `$isOwnTransportLost`, `returnedToEndedCall`, `transportStale(CallRole)` (наружу в app), локальный предел ожидания | R5, R7 |
| `callSync.model` | `syncRequested(CallRole[])` → `call_sync`; проверка живости по ответу `call_state` (→ `transportStale`) | R5, R7 |
| `callRestore.model` | снимок → `callModel.callRestored` (переход в `call.model`), медиа восстановленного звонка, `call_resume` после восстановления | R5, R6 |
| `mediaRecovery.model` | `$mediaConnectionLost`, ICE restart, пересборка сессии, повторное получение треков, `micBusy` | R6 |
| `peerAudio.model` | `$peerAudioBlocked`, `peerAudioBlocked`, `peerAudioPlaying`, `continueCallClicked` | R8 |
| `backgroundHint.model` | `$isBackgroundHintShown`, `backgroundHintDismissed` (localStorage) | FR-012 |
| `callNotificationOpen.model` | `$pendingNotificationCallId`, `notificationOpened(callId)`, `staleCallNotificationOpened` | R10 |

`PeerPresenceState.presence` во фронтовом типе приводится к значениям протокола: `"on_screen" | "background" | "disconnected"` (макетное `"onScreen"` заменяется).

Отображаемое присутствие собеседника `callPresenceModel.$shownPeerPresence`: `disconnected`, если сервер сообщил `disconnected` или `$mediaConnectionLost` в фазе `active`; иначе значение сервера. Подписи — существующие `getPeerInterruption` / `getPeerAudioNotice` (FR-032/FR-033).

### `features/callNotifications` (ученик)

| Модель | Сторы / события |
|--------|-----------------|
| `callNotifications.model` | `$status: CallNotificationsStatus`, `$isInviteDismissed`, `enableClicked`, `toggled`, `inviteDismissed`, `CabinetGate` (синхронизация подписки при входе в кабинет) |

### `entities/notifications` (преподаватель)

`ReminderSettings` получает `callNotificationsEnabled`; `$callNotificationsEnabled` (derived), `callNotificationsToggled`; правила подписки устройства — R11.

### `features/logoutConfirmation`

`sessionCleanup.model`: `tutorLogoutConfirmed` / `studentLogoutRequested` → `logoutStarted(role)` → `cleanupFx` (подписка устройства) → прежние события выхода. Звонок по `logoutStarted` завершает `app/model/sessionLogout.model.ts` (фича не импортирует `features/videoCall`).

## 4. Хранилище устройства (localStorage)

| Ключ | Значение | Где |
|------|----------|-----|
| `callBackgroundHintDismissed` | `"1"` | подсказка FR-012 закрыта |
| `callNotificationsInviteDismissed` | `"1"` | карточка-приглашение ученика закрыта |
