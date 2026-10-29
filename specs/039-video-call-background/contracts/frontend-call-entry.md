# Contract: единая точка входа звонка во фронтенде (FR-031)

`features/videoCall/model/callEntry.model.ts`, экспорт `callEntryModel` из `features/videoCall`.

| Событие | Payload | Ведёт в | Кто вызывает |
|---------|---------|---------|--------------|
| `startRequested` | `StartCallParams` | `callModel.callStarted` (только в фазе `idle`, как прежний `callRequest.model`) | `callConfirmModel.confirmed` |
| `answerRequested` | — | `callModel.acceptCall` | `IncomingCallModal` |
| `rejectRequested` | — | `callModel.rejectCall` | `IncomingCallModal` |
| `resumeRequested` | `{ role: CallRole; snapshot: CallSnapshot }` | восстановление звонка из снимка (`callResume.model`) | `callResume.model` по `call_state` |

Правила:

- Экраны и модели других фич не вызывают `callModel.callStarted/acceptCall/rejectCall` напрямую (проверяется grep в задаче на финальную проверку).
- `cancelCall`, `hangUp`, переключатели медиа остаются в `callModel` — они не меняют, кто ведёт медиасессию.
- Нативная оболочка (PR #95) позже перенаправит эти четыре события; здесь определение оболочки и мост не делаются.

## Связь с app-слоем

| Из app | В feature | Зачем |
|--------|-----------|-------|
| `visibilitychange`/`pagehide` в `App.tsx` → `appInitModel.appVisibilityChanged(boolean)` | `callPresenceModel.visibilityChanged` | присутствие |
| `socketConnection` `ready` (по роли) | `callPresenceModel.transportReady(role)` | `presence_update` после регистрации; `call_sync` (`callSync.model`), если страница на экране или у неё звонок этой роли |
| `callResumeModel.transportStale(role)` | `connection.reconnectRequested(resume)` нужной роли: `resume = false`, пока ждём снимок для нажатого уведомления (`$pendingNotificationCallId`), иначе `true` | мёртвый сокет после сна; нажатие на уведомление — явное открытие (R3) |
| `navigator.serviceWorker` `message` в `App.tsx` | `callNotificationOpenModel.notificationOpened(callId)` | нажатие на уведомление при открытом приложении |
| `connection_waiting` при живом звонке | `callModel` локальное завершение без сигналов | звонок забрало другое окно |
| закрытие `4000` текущего сокета | `callResumeModel.transportTakenElsewhere({ role, refused })`; `refused` — сокет не был зарегистрирован (отказ в переподключении) | звонок этой роли завершается локально без сигналов; тост «Звонок завершён» — при отказе и фазе не `incoming` (звонка на сервере уже нет) |
