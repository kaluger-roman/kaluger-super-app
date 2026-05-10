import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

const isUniqueViolation = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

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

  // Идемпотентная вставка: вместо read-then-write (TOCTOU) полагаемся на
  // partial unique index `(lessonId, intervalMinutes) WHERE status='PENDING'`
  // в БД. При параллельном вызове второй INSERT падает с P2002 и тихо
  // пропускается — гарантия атомарна на уровне PostgreSQL.
  for (const reminder of reminders) {
    try {
      await prisma.scheduledReminder.create({ data: reminder });
    } catch (err) {
      if (isUniqueViolation(err)) continue;
      throw err;
    }
  }
};

// Любые ручки, которые "снимают" будущие напоминания, должны учитывать
// и `PENDING`, и `PROCESSING`. Если PROCESSING-запись (claim в процессе
// доставки) пропустить, watchdog в `processScheduledReminders` через
// 10 минут вернёт её в PENDING — а к этому моменту recalculate уже мог
// создать дубликат с тем же (lessonId, intervalMinutes), и watchdog
// упадёт с P2002 на partial unique index, парализуя cron.
const ACTIVE_REMINDER_STATUSES = ["PENDING", "PROCESSING"] as const;

export const cancelRemindersForLesson = async (lessonId: string) => {
  await prisma.scheduledReminder.updateMany({
    where: {
      lessonId,
      status: { in: [...ACTIVE_REMINDER_STATUSES] },
    },
    data: {
      status: "CANCELLED",
      claimedAt: null,
    },
  });
};

export const recalculateRemindersForUser = async (userId: string) => {
  const now = new Date();

  // Cancel + recreate atomically to avoid race conditions
  await prisma.$transaction(async (tx) => {
    // Отменяем и PENDING, и PROCESSING — иначе claim, который сейчас
    // доставляется в `processScheduledReminders`, останется в БД и
    // столкнётся с новой PENDING-записью при попытке watchdog'а вернуть
    // его в PENDING.
    await tx.scheduledReminder.updateMany({
      where: {
        userId,
        status: { in: [...ACTIVE_REMINDER_STATUSES] },
      },
      data: {
        status: "CANCELLED",
        claimedAt: null,
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
      status: { in: [...ACTIVE_REMINDER_STATUSES] },
    },
    data: {
      status: "CANCELLED",
      claimedAt: null,
    },
  });
};
