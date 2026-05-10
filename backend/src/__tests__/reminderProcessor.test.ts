import { faker } from "@faker-js/faker";
import webpush from "web-push";
import prisma from "../lib/prisma";
import { processScheduledReminders } from "../services/reminderProcessor";

jest.mock("web-push", () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

describe("reminderProcessor service", () => {
  let userId: string;
  let studentId: string;

  beforeAll(async () => {
    process.env.VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.VAPID_SUBJECT = "mailto:test@test.com";

    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });
    userId = user.id;

    const student = await prisma.student.create({
      data: {
        name: "Иванов Пётр",
        tutorId: userId,
      },
    });
    studentId = student.id;
  });

  beforeEach(async () => {
    await prisma.scheduledReminder.deleteMany({ where: { userId } });
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    await prisma.reminderSettings.deleteMany({ where: { userId } });
    (webpush.sendNotification as jest.Mock).mockReset();
    (webpush.sendNotification as jest.Mock).mockResolvedValue({});
  });

  afterAll(async () => {
    await prisma.scheduledReminder.deleteMany({ where: { userId } });
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    await prisma.reminderSettings.deleteMany({ where: { userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("should process PENDING reminders at scheduledAt", async () => {
    await prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${faker.string.alphanumeric(10)}`,
        p256dh: "key",
        auth: "auth",
        userId,
      },
    });

    await prisma.reminderSettings.create({
      data: {
        userId,
        enabled: true,
        intervals: [30],
        muteWhenInLesson: false,
      },
    });

    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: futureTime,
        endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
        status: "SCHEDULED",
        tutorId: userId,
        studentId,
      },
    });

    // Create a reminder that should be processed now (scheduledAt in the past)
    await prisma.scheduledReminder.create({
      data: {
        scheduledAt: new Date(Date.now() - 60 * 1000), // 1 min ago
        intervalMinutes: 30,
        lessonId: lesson.id,
        userId,
        status: "PENDING",
      },
    });

    await processScheduledReminders();

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);

    const reminder = await prisma.scheduledReminder.findFirst({
      where: { lessonId: lesson.id },
    });
    expect(reminder!.status).toBe("SENT");
    expect(reminder!.sentAt).not.toBeNull();
  });

  it("should cancel reminders for cancelled lessons", async () => {
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: futureTime,
        endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
        status: "CANCELLED",
        tutorId: userId,
        studentId,
      },
    });

    await prisma.scheduledReminder.create({
      data: {
        scheduledAt: new Date(Date.now() - 60 * 1000),
        intervalMinutes: 30,
        lessonId: lesson.id,
        userId,
        status: "PENDING",
      },
    });

    await processScheduledReminders();

    expect(webpush.sendNotification).not.toHaveBeenCalled();

    const reminder = await prisma.scheduledReminder.findFirst({
      where: { lessonId: lesson.id },
    });
    expect(reminder!.status).toBe("CANCELLED");
  });

  it("should suppress reminders when muteWhenInLesson is enabled and user has active lesson", async () => {
    await prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${faker.string.alphanumeric(10)}`,
        p256dh: "key",
        auth: "auth",
        userId,
      },
    });

    await prisma.reminderSettings.create({
      data: {
        userId,
        enabled: true,
        intervals: [30],
        muteWhenInLesson: true,
      },
    });

    // Create an active lesson (currently in progress)
    await prisma.lesson.create({
      data: {
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Started 30 min ago
        endTime: new Date(Date.now() + 30 * 60 * 1000), // Ends in 30 min
        status: "IN_PROGRESS",
        tutorId: userId,
        studentId,
      },
    });

    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const upcomingLesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: futureTime,
        endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
        status: "SCHEDULED",
        tutorId: userId,
        studentId,
      },
    });

    await prisma.scheduledReminder.create({
      data: {
        scheduledAt: new Date(Date.now() - 60 * 1000),
        intervalMinutes: 30,
        lessonId: upcomingLesson.id,
        userId,
        status: "PENDING",
      },
    });

    await processScheduledReminders();

    expect(webpush.sendNotification).not.toHaveBeenCalled();

    const reminder = await prisma.scheduledReminder.findFirst({
      where: { lessonId: upcomingLesson.id },
    });
    expect(reminder!.status).toBe("CANCELLED");
  });

  it("should mark reminder as FAILED when sendPushToUser throws", async () => {
    await prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${faker.string.alphanumeric(10)}`,
        p256dh: "key",
        auth: "auth",
        userId,
      },
    });

    await prisma.reminderSettings.create({
      data: {
        userId,
        enabled: true,
        intervals: [30],
        muteWhenInLesson: false,
      },
    });

    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: futureTime,
        endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
        status: "SCHEDULED",
        tutorId: userId,
        studentId,
      },
    });

    await prisma.scheduledReminder.create({
      data: {
        scheduledAt: new Date(Date.now() - 60 * 1000),
        intervalMinutes: 30,
        lessonId: lesson.id,
        userId,
        status: "PENDING",
      },
    });

    (webpush.sendNotification as jest.Mock).mockRejectedValue(new Error("Push service unavailable"));

    await processScheduledReminders();

    const reminder = await prisma.scheduledReminder.findFirst({
      where: { lessonId: lesson.id },
    });
    expect(reminder!.status).toBe("FAILED");
    expect(reminder!.sentAt).toBeNull();
  });

  it("should not process future reminders", async () => {
    await prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${faker.string.alphanumeric(10)}`,
        p256dh: "key",
        auth: "auth",
        userId,
      },
    });

    const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: futureTime,
        endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
        status: "SCHEDULED",
        tutorId: userId,
        studentId,
      },
    });

    await prisma.scheduledReminder.create({
      data: {
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in the future
        intervalMinutes: 30,
        lessonId: lesson.id,
        userId,
        status: "PENDING",
      },
    });

    await processScheduledReminders();

    expect(webpush.sendNotification).not.toHaveBeenCalled();

    const reminder = await prisma.scheduledReminder.findFirst({
      where: { lessonId: lesson.id },
    });
    expect(reminder!.status).toBe("PENDING");
  });

  it("should claim at most REMINDER_BATCH_SIZE pending reminders per tick (regression: no take limit)", async () => {
    // Regression for bug-hunt 2026-05-09 #10: a backlog after server downtime
    // could be claimed atomically in a single transaction (and fully marked SENT
    // before push delivery), holding a long DB lock and overwhelming the push
    // provider. The fix caps each tick at 100.
    await prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${faker.string.alphanumeric(10)}`,
        p256dh: "key",
        auth: "auth",
        userId,
      },
    });

    await prisma.reminderSettings.create({
      data: {
        userId,
        enabled: true,
        intervals: [30],
        muteWhenInLesson: false,
      },
    });

    const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: futureTime,
        endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
        status: "SCHEDULED",
        tutorId: userId,
        studentId,
      },
    });

    const backlogSize = 105;
    const past = Date.now() - 60 * 60 * 1000;
    await prisma.scheduledReminder.createMany({
      data: Array.from({ length: backlogSize }, (_, i) => ({
        scheduledAt: new Date(past - i * 1000),
        intervalMinutes: 30,
        lessonId: lesson.id,
        userId,
        status: "PENDING" as const,
      })),
    });

    await processScheduledReminders();

    const stillPending = await prisma.scheduledReminder.count({
      where: { lessonId: lesson.id, status: "PENDING" },
    });
    const claimed = await prisma.scheduledReminder.count({
      where: { lessonId: lesson.id, status: { in: ["SENT", "FAILED"] } },
    });

    expect(claimed).toBeLessThanOrEqual(100);
    expect(claimed).toBeGreaterThan(0);
    expect(stillPending).toBe(backlogSize - claimed);
  });

  it("should apply per-user settings correctly when batch contains multiple users (regression: improve-hunt 2026-05-09 #3)", async () => {
    // Regression: the per-reminder settings/user lookups were batched into a
    // single Map keyed by userId. This test ensures settings are not crossed
    // between users — user A has muteWhenInLesson + active lesson (must skip),
    // user B has muteWhenInLesson disabled (must send).
    const otherUser = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: "Other Tutor",
      },
    });
    const otherStudent = await prisma.student.create({
      data: { name: "Иван Сидоров", tutorId: otherUser.id },
    });

    try {
      // user A: mute on, with an active lesson at processing time
      await prisma.pushSubscription.create({
        data: {
          endpoint: `https://push.example.com/${faker.string.alphanumeric(10)}`,
          p256dh: "key",
          auth: "auth",
          userId,
        },
      });
      await prisma.reminderSettings.create({
        data: { userId, enabled: true, intervals: [30], muteWhenInLesson: true },
      });
      const activeStart = new Date(Date.now() - 10 * 60 * 1000);
      const activeEnd = new Date(Date.now() + 60 * 60 * 1000);
      const activeLesson = await prisma.lesson.create({
        data: {
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: activeStart,
          endTime: activeEnd,
          status: "SCHEDULED",
          tutorId: userId,
          studentId,
        },
      });

      // user B: mute off
      await prisma.pushSubscription.create({
        data: {
          endpoint: `https://push.example.com/${faker.string.alphanumeric(10)}`,
          p256dh: "key",
          auth: "auth",
          userId: otherUser.id,
        },
      });
      await prisma.reminderSettings.create({
        data: {
          userId: otherUser.id,
          enabled: true,
          intervals: [30],
          muteWhenInLesson: false,
        },
      });
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const otherLesson = await prisma.lesson.create({
        data: {
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: futureTime,
          endTime: new Date(futureTime.getTime() + 60 * 60 * 1000),
          status: "SCHEDULED",
          tutorId: otherUser.id,
          studentId: otherStudent.id,
        },
      });

      const past = new Date(Date.now() - 60 * 1000);
      const reminderA = await prisma.scheduledReminder.create({
        data: {
          scheduledAt: past,
          intervalMinutes: 30,
          lessonId: activeLesson.id,
          userId,
          status: "PENDING",
        },
      });
      const reminderB = await prisma.scheduledReminder.create({
        data: {
          scheduledAt: past,
          intervalMinutes: 30,
          lessonId: otherLesson.id,
          userId: otherUser.id,
          status: "PENDING",
        },
      });

      await processScheduledReminders();

      const a = await prisma.scheduledReminder.findUnique({ where: { id: reminderA.id } });
      const b = await prisma.scheduledReminder.findUnique({ where: { id: reminderB.id } });

      expect(a!.status).toBe("CANCELLED");
      expect(b!.status).toBe("SENT");
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    } finally {
      await prisma.scheduledReminder.deleteMany({ where: { userId: otherUser.id } });
      await prisma.lesson.deleteMany({ where: { tutorId: otherUser.id } });
      await prisma.pushSubscription.deleteMany({ where: { userId: otherUser.id } });
      await prisma.reminderSettings.deleteMany({ where: { userId: otherUser.id } });
      await prisma.student.delete({ where: { id: otherStudent.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    }
  });
});
