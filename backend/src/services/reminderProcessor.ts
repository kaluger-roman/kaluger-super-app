import prisma from "../lib/prisma";
import { sendPushToUser, formatReminderTitle, formatReminderBody } from "./pushNotification";
import { isValidTimezone } from "../utils/time";
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

  let sentCount = 0;
  let cancelledCount = 0;
  let failedCount = 0;

  for (const reminder of reminders) {
    // Outer try/catch isolates a single reminder so an unexpected throw
    // (e.g. RangeError from invalid stored timezone) cannot abort the batch
    // and leave subsequent reminders permanently in PROCESSING. Watchdog
    // still recovers stuck rows on the next tick.
    try {
      const { lesson } = reminder;

      // Cancel if lesson is not in a schedulable status
      if (lesson.status !== "SCHEDULED" && lesson.status !== "RESCHEDULED") {
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: { status: "CANCELLED", sentAt: null, claimedAt: null },
        });
        cancelledCount++;
        continue;
      }

      // Check muteWhenInLesson
      const settings = await prisma.reminderSettings.findUnique({
        where: { userId: reminder.userId },
      });

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
          await prisma.scheduledReminder.update({
            where: { id: reminder.id },
            data: { status: "CANCELLED", sentAt: null, claimedAt: null },
          });
          cancelledCount++;
          continue;
        }
      }

      // Get user timezone for correct time formatting
      const user = await prisma.user.findUnique({
        where: { id: reminder.userId },
        select: { timezone: true },
      });

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
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: { status: "FAILED", sentAt: null, claimedAt: null },
        });
        failedCount++;
      } else {
        // Финализируем как SENT только после фактической доставки. Если
        // процесс упадёт между этим update'ом и web-push ответом —
        // запись остаётся в PROCESSING и watchdog вернёт её в PENDING.
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: { status: "SENT", sentAt: new Date(), claimedAt: null },
        });
        sentCount++;
      }
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
      await prisma.scheduledReminder
        .update({
          where: { id: reminder.id },
          data: { status: "FAILED", sentAt: null, claimedAt: null },
        })
        .catch((updateError) => {
          console.error(
            `Failed to mark reminder ${reminder.id} as FAILED:`,
            updateError
          );
        });
      failedCount++;
    }
  }

  if (sentCount > 0 || cancelledCount > 0 || failedCount > 0) {
    console.log(`Reminders processed: ${sentCount} sent, ${cancelledCount} cancelled, ${failedCount} failed`);
  }
};
