import prisma from "../lib/prisma";
import { sendPushToUser, formatReminderTitle, formatReminderBody } from "./pushNotification";
import type { PushNotificationPayload } from "../types";

export const processScheduledReminders = async () => {
  const now = new Date();

  // Atomically claim PENDING reminders by transitioning them, preventing duplicate processing on cron overlap
  const pendingReminders = await prisma.scheduledReminder.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: now },
    },
    select: { id: true },
  });

  if (pendingReminders.length === 0) return;

  const claimedIds = pendingReminders.map((r) => r.id);

  // Mark all as SENT upfront to prevent re-processing; will revert to FAILED/CANCELLED as needed
  await prisma.scheduledReminder.updateMany({
    where: { id: { in: claimedIds }, status: "PENDING" },
    data: { status: "SENT", sentAt: now },
  });

  // Re-fetch claimed reminders with full data
  const reminders = await prisma.scheduledReminder.findMany({
    where: { id: { in: claimedIds } },
    include: {
      lesson: {
        include: {
          student: true,
        },
      },
    },
  });

  let sentCount = 0;
  let cancelledCount = 0;
  let failedCount = 0;

  for (const reminder of reminders) {
    const { lesson } = reminder;

    // Cancel if lesson is not in a schedulable status
    if (lesson.status !== "SCHEDULED" && lesson.status !== "RESCHEDULED") {
      await prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: { status: "CANCELLED", sentAt: null },
      });
      cancelledCount++;
      continue;
    }

    // Check muteWhenInLesson
    const settings = await prisma.reminderSettings.findUnique({
      where: { userId: reminder.userId },
    });

    if (settings?.muteWhenInLesson) {
      const activeLesson = await prisma.lesson.findFirst({
        where: {
          tutorId: reminder.userId,
          status: "IN_PROGRESS",
          startTime: { lte: now },
          endTime: { gt: now },
        },
      });

      if (activeLesson) {
        // Muted — mark as cancelled since we won't retry
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: { status: "CANCELLED", sentAt: null },
        });
        cancelledCount++;
        continue;
      }
    }

    // Build notification payload
    const payload: PushNotificationPayload = {
      title: formatReminderTitle(reminder.intervalMinutes),
      body: formatReminderBody(
        lesson.subject,
        lesson.lessonType,
        lesson.student.name,
        lesson.startTime,
        lesson.endTime
      ),
      tag: `lesson-reminder-${lesson.id}-${reminder.intervalMinutes}`,
      data: {
        type: "lesson_reminder",
        lessonId: lesson.id,
        url: "/lessons",
      },
    };

    // Send push notification
    try {
      const result = await sendPushToUser(reminder.userId, payload);

      if (result.sent === 0) {
        // All deliveries failed or no subscriptions — mark as FAILED
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: { status: "FAILED", sentAt: null },
        });
        failedCount++;
      } else {
        // Already marked as SENT above
        sentCount++;
      }
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
      await prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: { status: "FAILED", sentAt: null },
      });
      failedCount++;
    }
  }

  if (sentCount > 0 || cancelledCount > 0 || failedCount > 0) {
    console.log(`Reminders processed: ${sentCount} sent, ${cancelledCount} cancelled, ${failedCount} failed`);
  }
};
