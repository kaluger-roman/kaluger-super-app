import request from "supertest";
import { faker } from "@faker-js/faker";

import { app } from "../../index";
import prisma from "../../lib/prisma";
import { generateToken } from "../../utils/auth";
import { generateStudentToken } from "../../utils/studentAuth";

jest.mock("../../services/email", () => ({
  sendPasswordResetEmail: jest.fn(async () => undefined),
  sendVerificationEmail: jest.fn(async () => undefined),
  sendEmailChangeVerification: jest.fn(async () => undefined),
  sendStudentVerificationEmail: jest.fn(async () => undefined),
}));

describe("studentCabinet controller", () => {
  let tutorId: string;
  let tutorToken: string;
  let studentId: string;
  let studentUserId: string;
  let studentToken: string;
  let otherStudentToken: string;

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
    tutorToken = generateToken({ userId: tutor.id, email: tutor.email });

    const student = await prisma.student.create({
      data: { name: "Ученик", tutorId },
    });
    studentId = student.id;

    const studentUser = await prisma.studentUser.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Ученик",
        studentId,
      },
    });
    studentUserId = studentUser.id;
    studentToken = generateStudentToken({
      studentUserId,
      email: studentUser.email,
      isStudent: true,
      tokenVersion: studentUser.tokenVersion,
    });

    // Другой студент — для проверки изоляции
    const otherStudent = await prisma.student.create({
      data: { name: "Другой", tutorId },
    });
    const otherStudentUser = await prisma.studentUser.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Другой",
        studentId: otherStudent.id,
      },
    });
    otherStudentToken = generateStudentToken({
      studentUserId: otherStudentUser.id,
      email: otherStudentUser.email,
      isStudent: true,
      tokenVersion: otherStudentUser.tokenVersion,
    });

    await prisma.lesson.create({
      data: {
        subject: "MATHEMATICS",
        startTime: new Date("2026-05-04T10:00:00.000Z"),
        endTime: new Date("2026-05-04T11:00:00.000Z"),
        tutorId,
        studentId,
        status: "SCHEDULED",
      },
    });
    await prisma.lesson.create({
      data: {
        subject: "PHYSICS",
        startTime: new Date("2026-05-05T12:00:00.000Z"),
        endTime: new Date("2026-05-05T13:00:00.000Z"),
        tutorId,
        studentId: otherStudent.id,
        status: "SCHEDULED",
      },
    });
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId } }).catch(() => undefined);
    await prisma.studentUser
      .deleteMany({
        where: {
          OR: [{ id: studentUserId }, { studentId }],
        },
      })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({ where: { tutorId } })
      .catch(() => undefined);
    await prisma.user.delete({ where: { id: tutorId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/student-cabinet/lessons");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a tutor JWT", async () => {
    const res = await request(app)
      .get("/api/student-cabinet/lessons")
      .set("Authorization", `Bearer ${tutorToken}`);
    expect(res.status).toBe(401);
  });

  it("returns only this student's lessons for the requested week", async () => {
    const res = await request(app)
      .get("/api/student-cabinet/lessons")
      .query({ weekStart: "2026-05-04" })
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.lessons).toHaveLength(1);
    expect(res.body.lessons[0].subject).toBe("MATHEMATICS");
    // Изоляция: никаких чувствительных полей
    expect(res.body.lessons[0]).not.toHaveProperty("price");
    expect(res.body.lessons[0]).not.toHaveProperty("notes");
  });

  it("does not leak other students' lessons even when querying same week", async () => {
    const res = await request(app)
      .get("/api/student-cabinet/lessons")
      .query({ weekStart: "2026-05-04" })
      .set("Authorization", `Bearer ${otherStudentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.lessons).toHaveLength(1);
    expect(res.body.lessons[0].subject).toBe("PHYSICS");
  });
});
