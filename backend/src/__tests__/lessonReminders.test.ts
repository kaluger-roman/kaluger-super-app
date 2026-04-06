import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../index";
import prisma from "../lib/prisma";
import { generateToken } from "../utils/auth";

jest.mock("../lib/wsManager", () => ({
  getWebSocketManager: jest.fn(() => ({
    broadcastLessonStatusUpdate: jest.fn(),
  })),
}));

describe("lesson reminder side-effects", () => {
  let authToken: string;
  let userId: string;
  let studentId: string;

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

    const student = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        tutorId: userId,
      },
    });
    studentId = student.id;

    // Create reminder settings
    await prisma.reminderSettings.create({
      data: {
        userId,
        enabled: true,
        intervals: [5, 30],
        muteWhenInLesson: false,
      },
    });
  });

  beforeEach(async () => {
    await prisma.scheduledReminder.deleteMany({ where: { userId } });
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
  });

  afterAll(async () => {
    await prisma.scheduledReminder.deleteMany({ where: { userId } });
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.reminderSettings.deleteMany({ where: { userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe("POST /api/lessons (createLesson)", () => {
    it("should create reminders for a new scheduled lesson", async () => {
      const futureTime = new Date(Date.now() + 3 * 60 * 60 * 1000);

      const res = await request(app)
        .post("/api/lessons")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: futureTime.toISOString(),
          endTime: new Date(futureTime.getTime() + 60 * 60 * 1000).toISOString(),
          studentId,
        })
        .expect(201);

      // Wait for async reminder creation
      await new Promise((resolve) => setTimeout(resolve, 200));

      const reminders = await prisma.scheduledReminder.findMany({
        where: { lessonId: res.body.lesson.id, status: "PENDING" },
      });

      expect(reminders.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("PUT /api/lessons/:id (updateLesson)", () => {
    it("should recalculate reminders when lesson time changes", async () => {
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

      // Create old reminders
      await prisma.scheduledReminder.create({
        data: {
          scheduledAt: new Date(futureTime.getTime() - 30 * 60 * 1000),
          intervalMinutes: 30,
          lessonId: lesson.id,
          userId,
          status: "PENDING",
        },
      });

      const newStartTime = new Date(Date.now() + 5 * 60 * 60 * 1000);

      await request(app)
        .put(`/api/lessons/${lesson.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          startTime: newStartTime.toISOString(),
          endTime: new Date(newStartTime.getTime() + 60 * 60 * 1000).toISOString(),
        })
        .expect(200);

      const reminders = await prisma.scheduledReminder.findMany({
        where: { lessonId: lesson.id },
      });

      const cancelled = reminders.filter((r: { status: string }) => r.status === "CANCELLED");
      const pending = reminders.filter((r: { status: string }) => r.status === "PENDING");

      expect(cancelled.length).toBeGreaterThanOrEqual(1);
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });

    it("should cancel reminders when lesson is cancelled", async () => {
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
          scheduledAt: new Date(futureTime.getTime() - 30 * 60 * 1000),
          intervalMinutes: 30,
          lessonId: lesson.id,
          userId,
          status: "PENDING",
        },
      });

      await request(app)
        .put(`/api/lessons/${lesson.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "CANCELLED" })
        .expect(200);

      const pendingCount = await prisma.scheduledReminder.count({
        where: { lessonId: lesson.id, status: "PENDING" },
      });

      expect(pendingCount).toBe(0);
    });
  });
});
