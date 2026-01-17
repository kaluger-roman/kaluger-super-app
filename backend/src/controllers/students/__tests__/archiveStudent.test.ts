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
