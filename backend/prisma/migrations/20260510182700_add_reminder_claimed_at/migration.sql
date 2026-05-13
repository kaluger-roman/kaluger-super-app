-- Поле claimedAt отслеживает момент атомарного claim'а PENDING -> PROCESSING.
-- Watchdog в reminderProcessor возвращает в PENDING все PROCESSING-записи
-- старше REMINDER_PROCESSING_TIMEOUT_MS — это лечит ситуацию, когда процесс
-- упал между claim'ом и фактической доставкой push.
--
-- До этого изменения тик переводил весь batch в SENT перед циклом доставки,
-- и при падении процесса оставшиеся записи навсегда застревали в SENT без
-- реальной отправки.

ALTER TABLE "scheduled_reminders" ADD COLUMN "claimedAt" TIMESTAMP(3);
