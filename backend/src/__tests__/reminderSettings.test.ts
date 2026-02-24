import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../index";
import prisma from "../lib/prisma";
import { generateToken } from "../utils/auth";

jest.mock("../services/reminderScheduler", () => ({
  recalculateRemindersForUser: jest.fn(),
  cancelAllPendingReminders: jest.fn(),
}));

describe("reminder settings integration tests", () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });

    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
  });

  beforeEach(async () => {
    await prisma.reminderSettings.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.reminderSettings.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe("GET /api/reminder-settings", () => {
    it("should lazy-create default settings on first call", async () => {
      const res = await request(app)
        .get("/api/reminder-settings")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual({
        enabled: false,
        intervals: [],
        muteWhenInLesson: false,
      });

      // Verify record was created in DB
      const settings = await prisma.reminderSettings.findUnique({
        where: { userId },
      });
      expect(settings).not.toBeNull();
    });

    it("should return existing settings", async () => {
      await prisma.reminderSettings.create({
        data: {
          userId,
          enabled: true,
          intervals: [5, 30],
          muteWhenInLesson: true,
        },
      });

      const res = await request(app)
        .get("/api/reminder-settings")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual({
        enabled: true,
        intervals: [5, 30],
        muteWhenInLesson: true,
      });
    });

    it("should return 401 without auth token", async () => {
      await request(app).get("/api/reminder-settings").expect(401);
    });
  });

  describe("PUT /api/reminder-settings", () => {
    it("should update settings with valid data", async () => {
      await prisma.reminderSettings.create({
        data: {
          userId,
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
        },
      });

      const res = await request(app)
        .put("/api/reminder-settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          enabled: true,
          intervals: [5, 15, 30],
          muteWhenInLesson: true,
        })
        .expect(200);

      expect(res.body).toEqual({
        enabled: true,
        intervals: [5, 15, 30],
        muteWhenInLesson: true,
      });
    });

    it("should auto-set intervals to [30] when enabling with empty intervals", async () => {
      await prisma.reminderSettings.create({
        data: {
          userId,
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
        },
      });

      const res = await request(app)
        .put("/api/reminder-settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ enabled: true })
        .expect(200);

      expect(res.body.enabled).toBe(true);
      expect(res.body.intervals).toEqual([30]);
    });

    it("should return 400 for invalid interval values", async () => {
      await prisma.reminderSettings.create({
        data: {
          userId,
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
        },
      });

      const res = await request(app)
        .put("/api/reminder-settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ intervals: [5, 20] })
        .expect(400);

      expect(res.body.error).toBe(
        "Недопустимый интервал напоминания. Допустимые значения: 5, 10, 15, 30, 60 минут"
      );
    });

    it("should return 400 for duplicate intervals", async () => {
      await prisma.reminderSettings.create({
        data: {
          userId,
          enabled: false,
          intervals: [],
          muteWhenInLesson: false,
        },
      });

      const res = await request(app)
        .put("/api/reminder-settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ intervals: [5, 5, 30] })
        .expect(400);

      expect(res.body.error).toBe("Такой интервал уже добавлен");
    });

    it("should allow partial update", async () => {
      await prisma.reminderSettings.create({
        data: {
          userId,
          enabled: true,
          intervals: [5, 30],
          muteWhenInLesson: false,
        },
      });

      const res = await request(app)
        .put("/api/reminder-settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ muteWhenInLesson: true })
        .expect(200);

      expect(res.body.enabled).toBe(true);
      expect(res.body.intervals).toEqual([5, 30]);
      expect(res.body.muteWhenInLesson).toBe(true);
    });

    it("should lazy-create settings if not exists", async () => {
      const res = await request(app)
        .put("/api/reminder-settings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ enabled: true, intervals: [15] })
        .expect(200);

      expect(res.body.enabled).toBe(true);
      expect(res.body.intervals).toEqual([15]);
    });
  });
});
