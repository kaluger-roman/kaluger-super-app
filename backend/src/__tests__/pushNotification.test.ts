import { faker } from "@faker-js/faker";
import { prisma } from "../lib/prisma";
import {
  sendPushToUser,
  formatReminderTitle,
  formatReminderBody,
} from "../services/pushNotification";
import { installWebPushDelivery, uniqueEmail, useVapidEnv } from "./helpers";
import type { PushDelivery } from "./helpers";

jest.mock("web-push", () => ({ sendNotification: jest.fn() }));

describe("pushNotification service", () => {
  let userId: string;
  let delivery: PushDelivery;

  useVapidEnv();

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });
    userId = user.id;
  });

  beforeEach(async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    delivery = installWebPushDelivery();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe("sendPushToUser", () => {
    const payload = {
      title: "Test",
      body: "Test body",
      tag: "test-tag",
      data: {
        type: "lesson_reminder" as const,
        lessonId: "lesson-1",
        url: "/lessons",
      },
    };

    it("should send push to all user subscriptions", async () => {
      await prisma.pushSubscription.createMany({
        data: [
          { endpoint: "https://push1.example.com", p256dh: "key1", auth: "auth1", userId },
          { endpoint: "https://push2.example.com", p256dh: "key2", auth: "auth2", userId },
        ],
      });

      const result = await sendPushToUser(userId, payload);

      expect(delivery).toHaveBeenCalledTimes(2);
      expect(JSON.parse(delivery.mock.calls[0][1])).toEqual(payload);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("should return zero counts when no subscriptions exist", async () => {
      const result = await sendPushToUser(userId, payload);

      expect(delivery).not.toHaveBeenCalled();
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should delete stale subscription on 410 error", async () => {
      await prisma.pushSubscription.create({
        data: {
          endpoint: "https://stale.example.com",
          p256dh: "key",
          auth: "auth",
          userId,
        },
      });

      delivery.mockRejectedValue({ statusCode: 410 });

      const result = await sendPushToUser(userId, payload);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);

      const count = await prisma.pushSubscription.count({
        where: { userId },
      });
      expect(count).toBe(0);
    });

    it("should delete stale subscription on 404 error", async () => {
      await prisma.pushSubscription.create({
        data: {
          endpoint: "https://notfound.example.com",
          p256dh: "key",
          auth: "auth",
          userId,
        },
      });

      delivery.mockRejectedValue({ statusCode: 404 });

      const result = await sendPushToUser(userId, payload);

      expect(result.failed).toBe(1);

      const count = await prisma.pushSubscription.count({
        where: { userId },
      });
      expect(count).toBe(0);
    });

    it("should count a push service that is down as failed and keep the subscription", async () => {
      await prisma.pushSubscription.create({
        data: { endpoint: "https://down.example.com", p256dh: "key", auth: "auth", userId },
      });
      delivery.mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await sendPushToUser(userId, payload);

      expect(result).toEqual({ sent: 0, failed: 1 });
      expect(await prisma.pushSubscription.count({ where: { userId } })).toBe(1);
    });

    it("should send reminders without call notification options", async () => {
      await prisma.pushSubscription.create({
        data: { endpoint: "https://push3.example.com", p256dh: "key", auth: "auth", userId },
      });

      await sendPushToUser(userId, payload);

      expect(delivery.mock.calls[0][2]).toEqual({});
    });

    it("should not send reminders to a student's devices", async () => {
      const student = await prisma.student.create({ data: { name: "Ученик", tutorId: userId } });
      const studentUser = await prisma.studentUser.create({
        data: { email: uniqueEmail(), password: "hashed", name: "Ученик", studentId: student.id },
      });
      await prisma.pushSubscription.create({
        data: {
          endpoint: `https://student.example.com/${studentUser.id}`,
          p256dh: "key",
          auth: "auth",
          studentUserId: studentUser.id,
        },
      });

      const result = await sendPushToUser(userId, payload);
      await prisma.studentUser.delete({ where: { id: studentUser.id } });
      await prisma.student.delete({ where: { id: student.id } });

      expect(result).toEqual({ sent: 0, failed: 0 });
      expect(delivery).not.toHaveBeenCalled();
    });

    it("should refuse to send without VAPID keys", async () => {
      delete process.env.VAPID_PRIVATE_KEY;

      await expect(sendPushToUser(userId, payload)).rejects.toThrow("VAPID ключи не настроены");
    });
  });

  describe("formatReminderTitle", () => {
    it("should format minutes correctly", () => {
      expect(formatReminderTitle(5)).toBe("Урок через 5 минут");
      expect(formatReminderTitle(30)).toBe("Урок через 30 минут");
    });

    it("should format 60 minutes as 1 hour", () => {
      expect(formatReminderTitle(60)).toBe("Урок через 1 час");
    });
  });

  describe("formatReminderBody", () => {
    it("should format lesson info in Russian", () => {
      const start = new Date("2026-02-24T15:00:00");
      const end = new Date("2026-02-24T16:00:00");

      const result = formatReminderBody("MATHEMATICS", "EGE", "Иванов Пётр", start, end);

      expect(result).toBe("Математика (ЕГЭ) — Иванов Пётр, 15:00–16:00");
    });

    it("should handle all subject and lesson type combinations", () => {
      const start = new Date("2026-02-24T09:00:00");
      const end = new Date("2026-02-24T10:30:00");

      expect(formatReminderBody("PHYSICS", "OGE", "Петрова Анна", start, end)).toBe(
        "Физика (ОГЭ) — Петрова Анна, 09:00–10:30"
      );

      expect(formatReminderBody("MATHEMATICS", "SCHOOL", "Сидоров Иван", start, end)).toBe(
        "Математика (Школа) — Сидоров Иван, 09:00–10:30"
      );

      expect(formatReminderBody("PHYSICS", "OLYMPICS", "Козлов Дмитрий", start, end)).toBe(
        "Физика (Олимпиады) — Козлов Дмитрий, 09:00–10:30"
      );
    });
  });
});
