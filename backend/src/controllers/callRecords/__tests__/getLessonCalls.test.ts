import request from "supertest";
import { uniqueEmail } from "../../../__tests__/helpers";

import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { generateStudentToken } from "../../../utils/studentAuth";

describe("GET /api/calls/lessons/:lessonId", () => {
  let tutorId: string;
  let tutorToken: string;
  let otherTutorId: string;
  let otherTutorToken: string;
  let studentId: string;
  let studentUserId: string;
  let studentToken: string;
  let lessonId: string;
  let otherLessonId: string;

  const createLesson = (startTime: string) =>
    prisma.lesson.create({
      data: {
        tutorId,
        studentId,
        startTime: new Date(startTime),
        endTime: new Date(new Date(startTime).getTime() + 60 * 60 * 1000),
      },
    });

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Анна",
        isEmailVerified: true,
      },
    });
    tutorId = tutor.id;
    tutorToken = generateToken({ userId: tutor.id, email: tutor.email });
    const otherTutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Чужой",
        isEmailVerified: true,
      },
    });
    otherTutorId = otherTutor.id;
    otherTutorToken = generateToken({ userId: otherTutor.id, email: otherTutor.email });
    const student = await prisma.student.create({ data: { name: "Иван", tutorId } });
    studentId = student.id;
    const studentUser = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Иван",
        isEmailVerified: true,
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
    lessonId = (await createLesson("2026-06-05T15:00:00.000Z")).id;
    otherLessonId = (await createLesson("2026-06-06T15:00:00.000Z")).id;

    await prisma.callRecord.createMany({
      data: [
        {
          tutorId,
          studentId,
          lessonId,
          callerKind: "TUTOR",
          status: "MISSED",
          startedAt: new Date("2026-06-05T15:00:00.000Z"),
        },
        {
          tutorId,
          studentId,
          lessonId,
          callerKind: "STUDENT",
          status: "COMPLETED",
          startedAt: new Date("2026-06-05T15:02:00.000Z"),
          endedAt: new Date("2026-06-05T15:52:00.000Z"),
          durationSeconds: 3000,
        },
        {
          tutorId,
          studentId,
          lessonId: otherLessonId,
          callerKind: "TUTOR",
          status: "COMPLETED",
          startedAt: new Date("2026-06-06T15:00:00.000Z"),
        },
        {
          tutorId,
          studentId,
          callerKind: "TUTOR",
          status: "CANCELED",
          startedAt: new Date("2026-06-05T15:01:00.000Z"),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.lesson.deleteMany({ where: { tutorId } });
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { id: { in: [tutorId, otherTutorId] } } });
  });

  it("should return the calls of the lesson from both sides, newest first", async () => {
    const res = await request(app)
      .get(`/api/calls/lessons/${lessonId}`)
      .set("Authorization", `Bearer ${tutorToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toMatchObject({
      direction: "incoming",
      status: "COMPLETED",
      durationSeconds: 3000,
      peerName: "Иван",
      lesson: { id: lessonId },
    });
    expect(res.body.items[1]).toMatchObject({
      direction: "outgoing",
      status: "MISSED",
      lesson: { id: lessonId },
    });
  });

  it("should return an empty list for a lesson of another tutor", async () => {
    const res = await request(app)
      .get(`/api/calls/lessons/${lessonId}`)
      .set("Authorization", `Bearer ${otherTutorToken}`)
      .expect(200);

    expect(res.body).toEqual({ items: [] });
  });

  it("should return an empty list for an unknown lesson", async () => {
    const res = await request(app)
      .get("/api/calls/lessons/missing-lesson")
      .set("Authorization", `Bearer ${tutorToken}`)
      .expect(200);

    expect(res.body).toEqual({ items: [] });
  });

  it("should return 401 without a token", async () => {
    await request(app).get(`/api/calls/lessons/${lessonId}`).expect(401);
  });

  it("should return 401 for a student token", async () => {
    await request(app)
      .get(`/api/calls/lessons/${lessonId}`)
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(401);
  });

  it("should return 500 when the calls cannot be loaded", async () => {
    jest.spyOn(prisma.callRecord, "findMany").mockRejectedValueOnce(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const res = await request(app)
        .get(`/api/calls/lessons/${lessonId}`)
        .set("Authorization", `Bearer ${tutorToken}`)
        .expect(500);

      expect(res.body).toEqual({ error: "Внутренняя ошибка сервера" });
    } finally {
      jest.restoreAllMocks();
    }
  });
});
