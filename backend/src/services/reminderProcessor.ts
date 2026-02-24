import prisma from "../lib/prisma";
import { sendPushToUser, formatReminderTitle, formatReminderBody } from "./pushNotification";
import type { PushNotificationPayload } from "../types";

export const processScheduledReminders = async () => {
  const now = new Date();

  // Find all PENDING reminders that should have been sent by now
  const pendingReminders = await prisma.scheduledReminder.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: now },
    },
    include: {
      lesson: {
        include: {
          student: true,
        },
      },
    },
  });

  if (pendingReminders.length === 0) return;

  let sentCount = 0;
  let cancelledCount = 0;

  for (const reminder of pendingReminders) {
    const { lesson } = reminder;

    // Cancel if lesson is not in a schedulable status
    if (lesson.status !== "SCHEDULED" && lesson.status !== "RESCHEDULED") {
      await prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: { status: "CANCELLED" },
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
          data: { status: "CANCELLED" },
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
      await sendPushToUser(reminder.userId, payload);

      await prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      sentCount++;
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
    }
  }

  if (sentCount > 0 || cancelledCount > 0) {
    console.log(`Reminders processed: ${sentCount} sent, ${cancelledCount} cancelled`);
  }
};
