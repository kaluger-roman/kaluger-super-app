# Data Model: PWA и напоминания об уроках

**Feature**: 008-pwa-lesson-reminders
**Date**: 2026-02-23

## New Entities

### PushSubscription

Запись о подписке устройства на push-уведомления. Один пользователь может иметь несколько подписок (разные устройства/браузеры).

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | String (cuid) | PK | Уникальный идентификатор |
| endpoint | String | unique | URL push-сервиса (из PushSubscription API) |
| p256dh | String | required | Ключ шифрования (из subscription.keys) |
| auth | String | required | Ключ аутентификации (из subscription.keys) |
| deviceName | String | optional | Название устройства (для отображения в настройках) |
| userId | String | FK → User, required | Привязка к пользователю |
| createdAt | DateTime | auto | Дата создания подписки |

**Relationships**:
- `User` 1 → N `PushSubscription` (один пользователь — несколько устройств)

**Indexes**:
- `userId` — быстрый поиск подписок пользователя
- `endpoint` — unique constraint, предотвращает дубли

**Lifecycle**:
- Создаётся при подписке на push-уведомления (пользователь включает напоминания)
- Удаляется при отписке, или автоматически при ошибке доставки (410 Gone / 404)
- Обновляется при изменении токена подписки (новый endpoint заменяет старый)

### ReminderSettings

Пользовательские настройки напоминаний. Одна запись на пользователя.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | String (cuid) | PK | Уникальный идентификатор |
| enabled | Boolean | default: false | Включены ли напоминания |
| intervals | Int[] | default: [] | Список интервалов в минутах (например [5, 30]) |
| muteWhenInLesson | Boolean | default: false | Не беспокоить во время урока |
| userId | String | FK → User, unique | Привязка к пользователю (1:1) |
| createdAt | DateTime | auto | Дата создания |
| updatedAt | DateTime | auto | Дата последнего обновления |

**Relationships**:
- `User` 1 → 1 `ReminderSettings`

**Validation rules**:
- `intervals` — только значения из предустановленного набора: [5, 10, 15, 30, 60]
- Дублирующие значения в `intervals` запрещены
- При `enabled = true` и пустом `intervals` — автоматически устанавливается `[30]`

**Lifecycle**:
- Создаётся при первом обращении к настройкам (lazy creation)
- При выключении (`enabled = false`) — `intervals` сохраняются
- При повторном включении — восстанавливаются сохранённые `intervals`

### ScheduledReminder

Запланированное напоминание о конкретном уроке. Создаётся системой автоматически.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | String (cuid) | PK | Уникальный идентификатор |
| scheduledAt | DateTime | required | Время отправки напоминания |
| intervalMinutes | Int | required | Интервал напоминания (за сколько минут до урока) |
| status | Enum | default: PENDING | PENDING / SENT / CANCELLED |
| sentAt | DateTime | optional | Фактическое время отправки |
| lessonId | String | FK → Lesson, required | Привязка к уроку |
| userId | String | FK → User, required | Привязка к пользователю |
| createdAt | DateTime | auto | Дата создания |

**Relationships**:
- `Lesson` 1 → N `ScheduledReminder` (один урок — несколько напоминаний по разным интервалам)
- `User` 1 → N `ScheduledReminder`

**Indexes**:
- `[status, scheduledAt]` — для cron-запроса: найти PENDING напоминания, время которых наступило
- `[lessonId]` — для пересчёта напоминаний при изменении урока
- `[userId, status]` — для статистики/отладки

**State transitions**:
```
PENDING → SENT       (cron отправил уведомление)
PENDING → CANCELLED  (урок отменён/удалён, или настройки изменились)
```

**Lifecycle**:
- Создаётся при создании/обновлении урока со статусом SCHEDULED/RESCHEDULED
- Пересчитывается при изменении времени урока или настроек пользователя
- Отменяется (CANCELLED) при отмене/удалении урока
- Помечается SENT после успешной отправки push
- Не создаётся, если scheduledAt уже в прошлом

## Modified Entities

### User (existing)

Добавляются связи с новыми таблицами:

| New Relationship | Type | Description |
|-----------------|------|-------------|
| pushSubscriptions | PushSubscription[] | Подписки на push-уведомления |
| reminderSettings | ReminderSettings? | Настройки напоминаний (0..1) |
| scheduledReminders | ScheduledReminder[] | Запланированные напоминания |

### Lesson (existing)

Добавляется связь:

| New Relationship | Type | Description |
|-----------------|------|-------------|
| scheduledReminders | ScheduledReminder[] | Напоминания для этого урока |

## Prisma Schema (reference)

```prisma
enum ReminderStatus {
  PENDING
  SENT
  CANCELLED
}

model PushSubscription {
  id         String   @id @default(cuid())
  endpoint   String   @unique
  p256dh     String
  auth       String
  deviceName String?
  createdAt  DateTime @default(now())

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscriptions")
}

model ReminderSettings {
  id               String   @id @default(cuid())
  enabled          Boolean  @default(false)
  intervals        Int[]    @default([])
  muteWhenInLesson Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("reminder_settings")
}

model ScheduledReminder {
  id              String         @id @default(cuid())
  scheduledAt     DateTime
  intervalMinutes Int
  status          ReminderStatus @default(PENDING)
  sentAt          DateTime?
  createdAt       DateTime       @default(now())

  lessonId String
  lesson   Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, scheduledAt])
  @@index([lessonId])
  @@index([userId, status])
  @@map("scheduled_reminders")
}
```

## Cron Logic: Reminder Processing

Ежеминутная cron-задача `processScheduledReminders`:

1. Найти все `ScheduledReminder` со `status = PENDING` и `scheduledAt <= now`
2. Для каждого напоминания:
   a. Проверить статус урока — если не SCHEDULED/RESCHEDULED → пометить CANCELLED
   b. Проверить `muteWhenInLesson` — если включено, проверить есть ли у пользователя урок с `startTime <= now < endTime`
   c. Если всё ОК — отправить push на все подписки пользователя
   d. Пометить как SENT с `sentAt = now`
3. При ошибке доставки (410/404) — удалить невалидную подписку

## Recalculation Triggers

Напоминания пересчитываются при:
- Создании урока (SCHEDULED) → создать ScheduledReminder для каждого интервала пользователя
- Обновлении времени урока → отменить старые, создать новые
- Изменении статуса урока на CANCELLED/COMPLETED → отменить PENDING напоминания
- Изменении настроек пользователя (intervals) → пересчитать для всех будущих уроков
