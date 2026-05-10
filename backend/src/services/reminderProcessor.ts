import prisma from "../lib/prisma";
import { isValidTimezone } from "../utils/time";
import { sendPushToUser, formatReminderTitle, formatReminderBody } from "./pushNotification";
import type { PushNotificationPayload } from "../types";

// Limits per-tick batch size so a backlog after server downtime doesn't
// hold a long DB transaction or overwhelm the push provider in one minute.
const REMINDER_BATCH_SIZE = 100;

// Если PROCESSING висит дольше — считаем claim "застрявшим" (процесс упал
// между claim'ом и доставкой) и возвращаем в PENDING. 10 минут — это с
// большим запасом дольше, чем cron-тик (1 минута), но достаточно мало,
// чтобы пользователь увидел напоминание не сильно позже расписанного времени.
const REMINDER_PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

export const processScheduledReminders = async () => {
  const now = new Date();

  // Watchdog: возвращаем в PENDING все PROCESSING-записи, claim'нутые более
  // REMINDER_PROCESSING_TIMEOUT_MS назад. Это покрывает случай, когда процесс
  // упал между claim'ом (PENDING -> PROCESSING) и финализацией доставки;
  // без этого записи навсегда застревали бы в SENT/PROCESSING без push.
  const watchdogCutoff = new Date(now.getTime() - REMINDER_PROCESSING_TIMEOUT_MS);
  await prisma.scheduledReminder.updateMany({
    where: {
      status: "PROCESSING",
      claimedAt: { lt: watchdogCutoff },
    },
    data: { status: "PENDING", claimedAt: null },
  });

  // Atomically claim PENDING reminders inside a transaction to prevent duplicate processing on cron overlap
  const reminders = await prisma.$transaction(async (tx) => {
    const pending = await tx.scheduledReminder.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
      },
      select: { id: true },
      orderBy: { scheduledAt: "asc" },
      take: REMINDER_BATCH_SIZE,
    });

    if (pending.length === 0) return [];

    const ids = pending.map((r) => r.id);

    // Claim in PROCESSING (не сразу SENT) — финализация в SENT происходит
    // после фактической доставки push в цикле ниже. Это лечит silent loss
    // при падении процесса между транзакцией и циклом.
    await tx.scheduledReminder.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: { status: "PROCESSING", claimedAt: now },
    });

    return tx.scheduledReminder.findMany({
      where: { id: { in: ids }, status: "PROCESSING" },
      include: {
        lesson: {
          include: {
            student: true,
          },
        },
      },
    });
  });

  if (reminders.length === 0) return;

  // Batch-load settings and user timezones once per unique userId to avoid N+1
  // queries inside the per-reminder loop (was up to 200 queries per cron tick).
  const userIds = [...new Set(reminders.map((r) => r.userId))];
  const [settingsRows, userRows] = await Promise.all([
    prisma.reminderSettings.findMany({ where: { userId: { in: userIds } } }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, timezone: true },
    }),
  ]);
  const settingsByUser = new Map(settingsRows.map((s) => [s.userId, s]));
  const userById = new Map(userRows.map((u) => [u.id, u]));

  let sentCount = 0;
  let cancelledCount = 0;
  let failedCount = 0;

  // Все финализации статуса (SENT/FAILED/CANCELLED) делаются через
  // updateMany c предикатом status='PROCESSING'. Если параллельный
  // cancelRemindersForLesson / recalculateRemindersForUser уже перевёл
  // запись в CANCELLED, наш update не тронет её (count=0) и не перепишет
  // CANCELLED обратно. Это плюс — пользователь, отменивший урок прямо в
  // момент доставки, получит свой CANCELLED, и watchdog не столкнётся с
  // лишним PROCESSING-снапшотом.
  const finalize = async (
    reminderId: string,
    data: {
      status: "SENT" | "FAILED" | "CANCELLED";
      sentAt: Date | null;
    },
  ) => {
    await prisma.scheduledReminder.updateMany({
      where: { id: reminderId, status: "PROCESSING" },
      data: { ...data, claimedAt: null },
    });
  };

  for (const reminder of reminders) {
    // Outer try/catch isolates a single reminder so an unexpected throw
    // (e.g. RangeError from invalid stored timezone, or a transient DB error
    // on the per-reminder DB calls below) cannot abort the batch and leave
    // subsequent reminders permanently in PROCESSING. The watchdog at the
    // top of the next tick recovers stuck rows.
    try {
      const { lesson } = reminder;

      // Cancel if lesson is not in a schedulable status
      if (lesson.status !== "SCHEDULED" && lesson.status !== "RESCHEDULED") {
        await finalize(reminder.id, { status: "CANCELLED", sentAt: null });
        cancelledCount++;
        continue;
      }

      const settings = settingsByUser.get(reminder.userId);

      if (settings?.muteWhenInLesson) {
        // FR-028: detect active lesson by scheduled time, not actual status
        const activeLesson = await prisma.lesson.findFirst({
          where: {
            tutorId: reminder.userId,
            status: { in: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
            startTime: { lte: now },
            endTime: { gt: now },
          },
        });

        if (activeLesson) {
          // Muted — mark as cancelled since we won't retry
          await finalize(reminder.id, { status: "CANCELLED", sentAt: null });
          cancelledCount++;
          continue;
        }
      }

      const user = userById.get(reminder.userId);
      const safeTimezone =
        user?.timezone && isValidTimezone(user.timezone)
          ? user.timezone
          : undefined;

      // Build notification payload
      const payload: PushNotificationPayload = {
        title: formatReminderTitle(reminder.intervalMinutes),
        body: formatReminderBody(
          lesson.subject,
          lesson.lessonType,
          lesson.student.name,
          lesson.startTime,
          lesson.endTime,
          safeTimezone
        ),
        tag: `lesson-reminder-${lesson.id}-${reminder.intervalMinutes}`,
        data: {
          type: "lesson_reminder",
          lessonId: lesson.id,
          url: "/lessons",
        },
      };

      // Send push notification
      const result = await sendPushToUser(reminder.userId, payload);

      if (result.sent === 0) {
        // All deliveries failed or no subscriptions — mark as FAILED
        await finalize(reminder.id, { status: "FAILED", sentAt: null });
        failedCount++;
      } else {
        // Финализируем как SENT только после фактической доставки. Если
        // процесс упадёт между этим update'ом и web-push ответом —
        // запись остаётся в PROCESSING и watchdog вернёт её в PENDING.
        await finalize(reminder.id, { status: "SENT", sentAt: new Date() });
        sentCount++;
      }
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
      await finalize(reminder.id, { status: "FAILED", sentAt: null }).catch(
        (updateError) => {
          console.error(
            `Failed to mark reminder ${reminder.id} as FAILED:`,
            updateError,
          );
        },
      );
      failedCount++;
    }
  }

  if (sentCount > 0 || cancelledCount > 0 || failedCount > 0) {
    console.log(`Reminders processed: ${sentCount} sent, ${cancelledCount} cancelled, ${failedCount} failed`);
  }
};
