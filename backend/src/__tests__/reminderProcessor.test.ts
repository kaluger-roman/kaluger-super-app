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
});
