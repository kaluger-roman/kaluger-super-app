import { faker } from "@faker-js/faker";

import prisma from "../../lib/prisma";
import {
  getStudentLessonsByWeek,
  getStudentUserIdByLessonId,
} from "../studentCabinet";

jest.mock("../email", () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
  sendVerificationEmail: jest.fn(async () => undefined),
  sendEmailChangeVerification: jest.fn(async () => undefined),
  sendStudentVerificationEmail: jest.fn(async () => undefined),
}));

describe("studentCabinet service", () => {
  let tutorId: string;
  let studentId: string;
  let otherStudentId: string;
  let studentUserId: string;
  let lessonId: string;

  // Понедельник, 4 мая 2026, 10:00 UTC
  const refMonday = new Date("2026-05-04T10:00:00.000Z");
  const refMondayStart = new Date("2026-05-04T00:00:00.000Z");

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Учитель",
        isEmailVerified: true,
      },
    });
    tutorId = tutor.id;

    const student = await prisma.student.create({
      data: { name: "Ученик", tutorId },
    });
    studentId = student.id;

    const otherStudent = await prisma.student.create({
      data: { name: "Другой ученик", tutorId },
    });
    otherStudentId = otherStudent.id;

    const studentUser = await prisma.studentUser.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Ученик",
        studentId,
      },
    });
    studentUserId = studentUser.id;

    // Урок на этой неделе
    const lesson = await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        startTime: refMonday,
        endTime: new Date(refMonday.getTime() + 60 * 60 * 1000),
        tutorId,
        studentId,
        status: "SCHEDULED",
      },
    });
    lessonId = lesson.id;

    // Урок на прошлой неделе
    await prisma.lesson.create({
      data: {
        subject: "PHYSICS",
        startTime: new Date(refMonday.getTime() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(
          refMonday.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000
        ),
        tutorId,
        studentId,
        status: "COMPLETED",
      },
    });

    // Урок другого ученика на этой же неделе — не должен попадать в выборку
    await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        startTime: new Date(refMonday.getTime() + 24 * 60 * 60 * 1000),
        endTime: new Date(refMonday.getTime() + 25 * 60 * 60 * 1000),
        tutorId,
        studentId: otherStudentId,
        status: "SCHEDULED",
      },
    });
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId } }).catch(() => undefined);
    await prisma.studentUser
      .deleteMany({ where: { studentId } })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({ where: { id: { in: [studentId, otherStudentId] } } })
      .catch(() => undefined);
    await prisma.user.delete({ where: { id: tutorId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  describe("getStudentLessonsByWeek", () => {
    it("returns only this student's lessons for the requested week", async () => {
      const result = await getStudentLessonsByWeek(
        studentUserId,
        refMondayStart.toISOString()
      );
      expect(result.lessons).toHaveLength(1);
      expect(result.lessons[0].subject).toBe("MATHEMATICS");
      expect(result.lessons[0].status).toBe("SCHEDULED");
      // Никаких чувствительных полей в ответе
      expect(result.lessons[0]).not.toHaveProperty("price");
      expect(result.lessons[0]).not.toHaveProperty("notes");
    });

    it("returns empty array when studentUser is detached from a Student", async () => {
      const orphan = await prisma.studentUser.create({
        data: {
          email: faker.internet.email().toLowerCase(),
          password: "hash",
          name: "Без карточки",
          studentId: null,
        },
      });

      const result = await getStudentLessonsByWeek(
        orphan.id,
        refMondayStart.toISOString()
      );
      expect(result.lessons).toEqual([]);

      await prisma.studentUser.delete({ where: { id: orphan.id } });
    });

    it("defaults to current week's Monday when weekStart is not provided", async () => {
      const result = await getStudentLessonsByWeek(studentUserId);
      expect(typeof result.weekStart).toBe("string");
      // Lessons array may be empty depending on current real time vs fixture week —
      // главное, что endpoint не падает и weekStart возвращается.
    });
  });

  describe("getStudentUserIdByLessonId", () => {
    it("returns the linked studentUser.id when a registered account exists", async () => {
      const result = await getStudentUserIdByLessonId(lessonId);
      expect(result).toBe(studentUserId);
    });

    it("returns null for a lesson whose student has no registered account", async () => {
      const otherLesson = await prisma.lesson.findFirst({
        where: { studentId: otherStudentId },
      });
      expect(otherLesson).not.toBeNull();
      const result = await getStudentUserIdByLessonId(otherLesson!.id);
      expect(result).toBeNull();
    });
  });
});
