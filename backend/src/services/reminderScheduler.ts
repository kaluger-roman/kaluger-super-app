import prisma from "../lib/prisma";

export const scheduleRemindersForLesson = async (lessonId: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) return;

  // Only schedule for SCHEDULED or RESCHEDULED lessons
  if (lesson.status !== "SCHEDULED" && lesson.status !== "RESCHEDULED") return;

  const settings = await prisma.reminderSettings.findUnique({
    where: { userId: lesson.tutorId },
  });

  if (!settings || !settings.enabled || settings.intervals.length === 0) return;

  const now = new Date();
  const reminders = [];

  for (const interval of settings.intervals) {
    const scheduledAt = new Date(lesson.startTime.getTime() - interval * 60 * 1000);

    // Skip if scheduledAt is in the past
    if (scheduledAt <= now) continue;

    reminders.push({
      scheduledAt,
      intervalMinutes: interval,
      lessonId: lesson.id,
      userId: lesson.tutorId,
    });
  }

  if (reminders.length > 0) {
    // Skip reminders that already exist (idempotency guard)
    const existing = await prisma.scheduledReminder.findMany({
      where: {
        lessonId: lesson.id,
        status: "PENDING",
      },
      select: { intervalMinutes: true },
    });

    const existingIntervals = new Set(existing.map((r) => r.intervalMinutes));
    const newReminders = reminders.filter((r) => !existingIntervals.has(r.intervalMinutes));

    if (newReminders.length > 0) {
      await prisma.scheduledReminder.createMany({
        data: newReminders,
      });
    }
  }
};

export const cancelRemindersForLesson = async (lessonId: string) => {
  await prisma.scheduledReminder.updateMany({
    where: {
      lessonId,
      status: "PENDING",
    },
    data: {
      status: "CANCELLED",
    },
  });
};

export const recalculateRemindersForUser = async (userId: string) => {
  const now = new Date();

  // Cancel + recreate atomically to avoid race conditions
  await prisma.$transaction(async (tx) => {
    // Cancel all pending reminders
    await tx.scheduledReminder.updateMany({
      where: {
        userId,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    });

    // Read settings inside transaction to avoid stale data
    const settings = await tx.reminderSettings.findUnique({
      where: { userId },
    });

    if (!settings || !settings.enabled || settings.intervals.length === 0) return;

    // Get all future lessons with schedulable statuses
    const futureLessons = await tx.lesson.findMany({
      where: {
        tutorId: userId,
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
        startTime: { gt: now },
      },
    });

    const reminders = [];

    for (const lesson of futureLessons) {
      for (const interval of settings.intervals) {
        const scheduledAt = new Date(lesson.startTime.getTime() - interval * 60 * 1000);

        // Skip if scheduledAt is in the past
        if (scheduledAt <= now) continue;

        reminders.push({
          scheduledAt,
          intervalMinutes: interval,
          lessonId: lesson.id,
          userId,
        });
      }
    }

    if (reminders.length > 0) {
      await tx.scheduledReminder.createMany({
        data: reminders,
      });
    }
  });
};

export const cancelAllPendingReminders = async (userId: string) => {
  await prisma.scheduledReminder.updateMany({
    where: {
      userId,
      status: "PENDING",
    },
    data: {
      status: "CANCELLED",
    },
  });
};
