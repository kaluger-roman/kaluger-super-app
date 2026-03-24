# API Contracts: Push Notifications & Reminder Settings

**Feature**: 008-pwa-lesson-reminders
**Date**: 2026-02-23
**Base URL**: `/api`

## Authentication

All endpoints require `Authorization: Bearer <JWT>` header.
Authenticated user extracted from `req.user.userId`.

---

## Push Subscription Endpoints

### GET /api/push/vapid-key

Returns the VAPID public key for client-side push subscription.

**Response 200**:
```json
{
  "vapidPublicKey": "BNcRdreALRFXTkOOKHCz..."
}
```

---

### POST /api/push/subscribe

Saves a push subscription for the authenticated user.

**Request Body**:
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNcRdreALRFXTkOO...",
      "auth": "tBHItJI5svbpC7..."
    }
  },
  "deviceName": "iPhone 15 Pro"
}
```

**Validation**:
- `subscription.endpoint` — required, valid URL
- `subscription.keys.p256dh` — required, non-empty string
- `subscription.keys.auth` — required, non-empty string
- `deviceName` — optional string, max 100 chars

**Response 201** (created):
```json
{
  "id": "clx123...",
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "deviceName": "iPhone 15 Pro",
  "createdAt": "2026-02-23T10:00:00.000Z"
}
```

**Response 200** (already exists — upsert by endpoint):
```json
{
  "id": "clx123...",
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "deviceName": "iPhone 15 Pro",
  "createdAt": "2026-02-23T10:00:00.000Z"
}
```

**Response 400**:
```json
{
  "error": "Некорректные данные подписки"
}
```

---

### DELETE /api/push/unsubscribe

Removes a push subscription by endpoint.

**Request Body**:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Validation**:
- `endpoint` — required, non-empty string

**Response 200**:
```json
{
  "message": "Подписка удалена"
}
```

**Response 404**:
```json
{
  "error": "Подписка не найдена"
}
```

---

### GET /api/push/subscriptions

Returns all push subscriptions for the authenticated user.

**Response 200**:
```json
{
  "subscriptions": [
    {
      "id": "clx123...",
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "deviceName": "iPhone 15 Pro",
      "createdAt": "2026-02-23T10:00:00.000Z"
    }
  ]
}
```

---

## Reminder Settings Endpoints

### GET /api/reminder-settings

Returns reminder settings for the authenticated user. Creates default settings if none exist (lazy creation).

**Response 200**:
```json
{
  "enabled": true,
  "intervals": [5, 30],
  "muteWhenInLesson": false
}
```

**Response 200** (first call — creates defaults):
```json
{
  "enabled": false,
  "intervals": [],
  "muteWhenInLesson": false
}
```

---

### PUT /api/reminder-settings

Updates reminder settings for the authenticated user.

**Request Body** (all fields optional — partial update):
```json
{
  "enabled": true,
  "intervals": [5, 15, 30],
  "muteWhenInLesson": true
}
```

**Validation**:
- `enabled` — optional boolean
- `intervals` — optional array of integers, each must be one of [5, 10, 15, 30, 60]
- `intervals` — no duplicate values
- `muteWhenInLesson` — optional boolean

**Business Logic**:
- If `enabled` changes to `true` and `intervals` is empty → auto-set to `[30]`
- If `intervals` changes → recalculate ScheduledReminders for all future lessons
- If `enabled` changes to `false` → cancel all PENDING ScheduledReminders

**Response 200**:
```json
{
  "enabled": true,
  "intervals": [5, 15, 30],
  "muteWhenInLesson": true
}
```

**Response 400**:
```json
{
  "error": "Недопустимый интервал напоминания. Допустимые значения: 5, 10, 15, 30, 60 минут"
}
```

**Response 400** (duplicates):
```json
{
  "error": "Такой интервал уже добавлен"
}
```

---

## Side Effects on Existing Endpoints

### POST /api/lessons (createLesson)

**Added behavior**: After creating a lesson with status SCHEDULED, create ScheduledReminder records based on user's ReminderSettings.

No API contract changes — only internal behavior.

### PUT /api/lessons/:id (updateLesson)

**Added behavior**:
- If `startTime` or `endTime` changes → recalculate ScheduledReminders
- If `status` changes to CANCELLED/COMPLETED → cancel PENDING ScheduledReminders
- If `status` changes to SCHEDULED/RESCHEDULED → create ScheduledReminders (if none exist)

No API contract changes — only internal behavior.

### DELETE /api/lessons/:id (deleteLesson)

**Added behavior**: Cascade delete handles ScheduledReminders automatically (onDelete: Cascade).

No API contract changes.

---

## Push Notification Payload

Sent from server to client via Web Push Protocol. Handled by Service Worker.

```json
{
  "title": "Урок через 30 минут",
  "body": "Математика (ЕГЭ) — Иванов Пётр, 15:00–16:00",
  "tag": "lesson-reminder-clx456-30",
  "data": {
    "type": "lesson_reminder",
    "lessonId": "clx456...",
    "url": "/lessons"
  }
}
```

**Title format**: `"Урок через {N} минут"` (или `"Урок через {N} час"` для 60 мин)

**Body format**: `"{Subject} ({LessonType}) — {StudentName}, {HH:MM}–{HH:MM}"`

**Tag**: `"lesson-reminder-{lessonId}-{intervalMinutes}"` — prevents duplicate notifications for the same lesson+interval

---

## Types (backend/src/types/index.ts)

```typescript
type PushSubscriptionDto = {
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
  deviceName?: string
}

type PushUnsubscribeDto = {
  endpoint: string
}

type ReminderSettingsDto = {
  enabled?: boolean
  intervals?: number[]
  muteWhenInLesson?: boolean
}

type ReminderSettingsResponse = {
  enabled: boolean
  intervals: number[]
  muteWhenInLesson: boolean
}

type PushSubscriptionResponse = {
  id: string
  endpoint: string
  deviceName: string | null
  createdAt: string
}

type PushNotificationPayload = {
  title: string
  body: string
  tag: string
  data: {
    type: 'lesson_reminder'
    lessonId: string
    url: string
  }
}
```
