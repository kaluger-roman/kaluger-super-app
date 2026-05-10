-- Закрываем TOCTOU в scheduleRemindersForLesson: до этой миграции idempotency-
-- guard читал PENDING-напоминания и затем createMany без транзакции/уникального
-- индекса, что при параллельных вызовах (повторный submit, cron + manual update)
-- приводило к дубликатам PENDING для одной пары (lessonId, intervalMinutes)
-- и, как следствие, к двум одинаковым push-уведомлениям пользователю.

-- Шаг 1: удалить уже накопившиеся дубликаты PENDING, оставив самый ранний
-- (идемпотентно для существующих БД: ничего не делает, если дублей нет).
DELETE FROM "scheduled_reminders" sr1
USING "scheduled_reminders" sr2
WHERE sr1."lessonId" = sr2."lessonId"
  AND sr1."intervalMinutes" = sr2."intervalMinutes"
  AND sr1.status = 'PENDING'
  AND sr2.status = 'PENDING'
  AND sr1.id > sr2.id;

-- Шаг 2: частичный уникальный индекс — только для PENDING. CANCELLED/SENT/FAILED
-- могут повторяться (например, переписать урок несколько раз — каждая отмена
-- даёт новый набор CANCELLED-записей).
CREATE UNIQUE INDEX "scheduled_reminders_pending_lesson_interval_key"
  ON "scheduled_reminders" ("lessonId", "intervalMinutes")
  WHERE status = 'PENDING';
