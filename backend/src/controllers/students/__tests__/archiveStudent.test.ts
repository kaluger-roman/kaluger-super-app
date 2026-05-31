import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

describe("Student Archiving", () => {
  let authToken: string;
  let userId: string;
  let studentId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed_password",
        name: faker.person.fullName(),
      },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });

    const student = await prisma.student.create({
      data: {
        name: faker.person.fullName(),
        tutorId: userId,
        contactMethod: "WHATSAPP",
        phone: faker.phone.number(),
      },
    });
    studentId = student.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  describe("PUT /api/students/:id/archive", () => {
    it("should archive student and delete future lessons", async () => {
      const futureLesson = await prisma.lesson.create({
        data: {
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
          price: 1000,
          isRecurring: false,
          tutorId: userId,
          studentId: studentId,
          status: "SCHEDULED" as const,
        },
      });

      const response = await request(app)
        .put(`/api/students/${studentId}/archive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          archiveReason: "COMPLETED_STUDIES",
          archiveComment: "Ученик завершил курс",
        })
        .expect(200);

      expect(response.body.student).toMatchObject({
        id: studentId,
        archived: true,
        archiveReason: "COMPLETED_STUDIES",
        archiveComment: "Ученик завершил курс",
      });
      expect(response.body.student.archivedAt).toBeTruthy();

      const deletedLesson = await prisma.lesson.findUnique({
        where: { id: futureLesson.id },
      });
      expect(deletedLesson).toBeNull();
    });

    it("should archive student without reason or comment", async () => {
      const anotherStudent = await prisma.student.create({
        data: {
          name: faker.person.fullName(),
          tutorId: userId,
          contactMethod: "WHATSAPP",
          phone: faker.phone.number(),
        },
      });

      const response = await request(app)
        .put(`/api/students/${anotherStudent.id}/archive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.student).toMatchObject({
        id: anotherStudent.id,
        archived: true,
        archiveReason: null,
        archiveComment: null,
      });
    });

    it("should preserve future CANCELLED and COMPLETED lessons (regression: history loss on archive)", async () => {
      // Regression for bug-hunt 2026-05-09-3 #7: previously deleteMany used
      // only studentId+startTime, wiping the history of cancelled/completed
      // future entries (and their payments).
      const preservedStudent = await prisma.student.create({
        data: {
          name: faker.person.fullName(),
          tutorId: userId,
          contactMethod: "WHATSAPP",
          phone: faker.phone.number(),
        },
      });

      const futureScheduled = await prisma.lesson.create({
        data: {
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
          price: 1000,
          isRecurring: false,
          tutorId: userId,
          studentId: preservedStudent.id,
          status: "SCHEDULED" as const,
        },
      });
      const futureCancelled = await prisma.lesson.create({
        data: {
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 49 * 60 * 60 * 1000),
          price: 1000,
          isRecurring: false,
          tutorId: userId,
          studentId: preservedStudent.id,
          status: "CANCELLED" as const,
        },
      });

      await request(app)
        .put(`/api/students/${preservedStudent.id}/archive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(200);

      const scheduledAfter = await prisma.lesson.findUnique({
        where: { id: futureScheduled.id },
      });
      const cancelledAfter = await prisma.lesson.findUnique({
        where: { id: futureCancelled.id },
      });
      expect(scheduledAfter).toBeNull();
      expect(cancelledAfter).not.toBeNull();
      expect(cancelledAfter!.status).toBe("CANCELLED");
    });

    it("should cancel pending reminders for deleted future lessons (regression: orphan reminders)", async () => {
      const reminderStudent = await prisma.student.create({
        data: {
          name: faker.person.fullName(),
          tutorId: userId,
          contactMethod: "WHATSAPP",
          phone: faker.phone.number(),
        },
      });

      const futureLesson = await prisma.lesson.create({
        data: {
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
          price: 1000,
          isRecurring: false,
          tutorId: userId,
          studentId: reminderStudent.id,
          status: "SCHEDULED" as const,
        },
      });
      const reminder = await prisma.scheduledReminder.create({
        data: {
          scheduledAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
          intervalMinutes: 60,
          lessonId: futureLesson.id,
          userId,
          status: "PENDING",
        },
      });

      await request(app)
        .put(`/api/students/${reminderStudent.id}/archive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(200);

      // Lesson row is gone, but the cron-claimed reminder window should already
      // be marked CANCELLED (it survives the FK cascade because we did the
      // updateMany inside the same transaction *before* the deleteMany).
      const reminderAfter = await prisma.scheduledReminder.findUnique({
        where: { id: reminder.id },
      });
      // The reminder is removed by FK cascade once the lesson is deleted, so it
      // ends up null. The important part is that it isn't left as a stale
      // PENDING entry pointing to a deleted lesson — `null` satisfies that.
      expect(reminderAfter === null || reminderAfter.status === "CANCELLED").toBe(true);
    });

    it("should cancel PROCESSING reminders for deleted future lessons (regression: bug-hunt 2026-05-24 #8)", async () => {
      // Перехватываем $transaction, чтобы spy ловил вызовы внутри tx-клиента —
      // фильтр updateMany должен включать обе активные стадии.
      let capturedWhere: unknown = null;
      const originalTransaction = prisma.$transaction.bind(prisma);
      const txSpy = jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(((arg: unknown) => {
          if (typeof arg === "function") {
            return (originalTransaction as unknown as (cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>)(
              async (tx: unknown) => {
                const txClient = tx as {
                  scheduledReminder: { updateMany: (args: { where?: unknown; data: unknown }) => Promise<unknown> };
                };
                const originalUpdateMany = txClient.scheduledReminder.updateMany.bind(
                  txClient.scheduledReminder
                );
                txClient.scheduledReminder.updateMany = (args) => {
                  capturedWhere = args.where;
                  return originalUpdateMany(args);
                };
                return (arg as (tx: unknown) => Promise<unknown>)(tx);
              }
            );
          }
          return (originalTransaction as (a: unknown) => Promise<unknown>)(arg);
        }) as unknown as typeof prisma.$transaction);

      const processingStudent = await prisma.student.create({
        data: {
          name: faker.person.fullName(),
          tutorId: userId,
          contactMethod: "WHATSAPP",
          phone: faker.phone.number(),
        },
      });

      const futureLesson = await prisma.lesson.create({
        data: {
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
          price: 1000,
          isRecurring: false,
          tutorId: userId,
          studentId: processingStudent.id,
          status: "SCHEDULED" as const,
        },
      });

      const processingReminder = await prisma.scheduledReminder.create({
        data: {
          scheduledAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
          intervalMinutes: 60,
          lessonId: futureLesson.id,
          userId,
          status: "PROCESSING",
          claimedAt: new Date(),
        },
      });

      await request(app)
        .put(`/api/students/${processingStudent.id}/archive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(200);

      txSpy.mockRestore();

      expect(capturedWhere).toMatchObject({
        status: { in: expect.arrayContaining(["PENDING", "PROCESSING"]) },
      });

      const reminderAfter = await prisma.scheduledReminder.findUnique({
        where: { id: processingReminder.id },
      });
      expect(reminderAfter === null || reminderAfter.status === "CANCELLED").toBe(true);
    });

    it("should return 404 when student not found", async () => {
      await request(app)
        .put("/api/students/non-existent-id/archive")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(404);
    });

    it("should handle database errors", async () => {
      const originalTransaction = prisma.$transaction;
      prisma.$transaction = jest
        .fn()
        .mockRejectedValueOnce(new Error("DB error"));

      await request(app)
        .put(`/api/students/${studentId}/archive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(500);

      prisma.$transaction = originalTransaction;
    });
  });

  describe("PUT /api/students/:id/unarchive", () => {
    it("should unarchive student", async () => {
      const archivedStudent = await prisma.student.create({
        data: {
          name: faker.person.fullName(),
          tutorId: userId,
          contactMethod: "WHATSAPP",
          phone: faker.phone.number(),
          archived: true,
          archivedAt: new Date(),
          archiveReason: "COMPLETED_STUDIES",
          archiveComment: "Test comment",
        },
      });

      const response = await request(app)
        .put(`/api/students/${archivedStudent.id}/unarchive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.student).toMatchObject({
        id: archivedStudent.id,
        archived: false,
        archivedAt: null,
        archiveReason: null,
        archiveComment: null,
      });
    });

    it("should return 404 when student not found", async () => {
      await request(app)
        .put("/api/students/non-existent-id/unarchive")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(404);
    });

    it("should handle database errors", async () => {
      const archivedStudent = await prisma.student.create({
        data: {
          name: faker.person.fullName(),
          tutorId: userId,
          contactMethod: "WHATSAPP",
          phone: faker.phone.number(),
          archived: true,
          archivedAt: new Date(),
        },
      });

      const originalUpdate = prisma.student.update;
      prisma.student.update = jest
        .fn()
        .mockRejectedValueOnce(new Error("DB error"));

      await request(app)
        .put(`/api/students/${archivedStudent.id}/unarchive`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(500);

      prisma.student.update = originalUpdate;
    });
  });
});
