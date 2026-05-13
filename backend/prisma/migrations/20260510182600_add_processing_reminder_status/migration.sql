-- Промежуточный статус PROCESSING для предотвращения тихой потери push-
-- напоминаний при падении процесса. См. детали в следующей миграции
-- (add_reminder_claimed_at) и в backend/src/services/reminderProcessor.ts.

-- AlterEnum: добавить PROCESSING
ALTER TYPE "public"."ReminderStatus" ADD VALUE 'PROCESSING';
