# Contract: push-сообщения о звонках и канал доставки — 039

## Канал доставки (FR-028)

```ts
// services/callNotification/callNotification.types.ts
type CallNotificationRecipient = { kind: CallerKindValue; id: string };
type CallNotificationMessage = {
  kind: "incoming_call" | "missed_call" | "call_closed";
  callId: string;
  callerName: string;
  recipientKind: CallerKindValue;   // для URL по роли
};
type DeliveryOutcome = "delivered" | "gone" | "failed";
type CallNotificationChannel = {
  channel: PushChannel;
  isConfigured: () => boolean;
  deliver: (device: PushSubscription, message: CallNotificationMessage) => Promise<DeliveryOutcome>;
};
```

Публичный API сервиса (единственное, что видит логика звонка):

| Функция | Возвращает | Правило |
|---------|------------|---------|
| `hasCallNotificationDevices(recipient)` | `Promise<boolean>` | есть подписки получателя в настроенных каналах; для преподавателя — и `callNotificationsEnabled !== false` |
| `notifyIncomingCall(recipient, message)` | `Promise<number>` — доставлено | на устройства получателя, параллельно, не больше `MAX_PUSH_SUBSCRIPTIONS_PER_OWNER` (10) самых свежих по `createdAt`; `gone` удаляет подписку |
| `notifyCallClosed(recipient, message)` | `Promise<void>` | best-effort, ошибки только в лог |

Новый канал = новое значение `PushChannel` + реализация `CallNotificationChannel` в реестре; `callFlow` не меняется.

## Web Push payload (канал `WEB_PUSH`)

Общая форма (как у напоминаний): `{ title, body, tag, data }`.

| `data.type` | title | body | tag | `data.url` | web-push опции |
|-------------|-------|------|-----|------------|----------------|
| `incoming_call` | «Входящий видеозвонок» | имя звонящего | `call-<callId>` | преподаватель `/dashboard?call=<callId>`, ученик `/student/cabinet/schedule?call=<callId>` | `TTL: 40`, `urgency: "high"`, `topic: <hash callId>` |
| `missed_call` | «Пропущенный звонок» | «Пропущенный звонок от <имя>» | `call-<callId>` | `/call/history` / `/student/cabinet/calls` | `TTL: 86400`, `urgency: "normal"`, тот же `topic` |
| `call_closed` | «Вызов завершён» | «Звонок принят или отклонён на другом устройстве» | `call-<callId>` | `/dashboard` / `/student/cabinet/schedule` | `TTL: 60`, `urgency: "normal"`, тот же `topic` |

`data` всегда содержит `{ type, callId, url }`. `topic` — 32 символа base64url от SHA-256 `callId` (ограничение протокола web-push: ≤32 символа URL-safe base64).

`missed_call` / `call_closed` отправляются только после завершения отправки `incoming_call` того же вызова: иначе закрывающий мог дойти до push-сервиса первым, а входящий следом показал бы «звонящее» уведомление о завершённом вызове.

## Service worker (`frontend/public/push-sw.js`)

- `push`: каждый push показывает уведомление (правило iOS). `incoming_call` — `requireInteraction: true`, `renotify: true`, вибрация `[300, 200, 300, 200, 300]`. `missed_call` — заменяет по тегу. `call_closed` — показывает и сразу закрывает все уведомления с этим тегом. `lesson_reminder` — как сейчас.
- `notificationclick`:
  - `incoming_call`: есть окно → `focus()` + `postMessage({ type: "call_notification_opened", callId })`, без `navigate`; нет → `openWindow(data.url)`. Страница, получившая `call_notification_opened`, открывает незарегистрированный сокет заново без `resume=1` (явное действие, забирает соединение у другой вкладки/устройства, пока вызов не принят; см. research.md R3).
  - остальные → прежнее поведение (`focus` + `navigate(url)` / `openWindow(url)`).
