import request from "supertest";
import { uniqueEmail } from "../../../__tests__/helpers";

import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { generateStudentToken } from "../../../utils/studentAuth";

describe("Call history REST API", () => {
  let tutorId: string;
  let tutorToken: string;
  let otherTutorId: string;
  let otherTutorToken: string;
  let studentId: string;
  let studentUserId: string;
  let studentToken: string;
  let unlinkedStudentUserId: string;
  let unlinkedStudentToken: string;

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Анна Петрова",
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

    const student = await prisma.student.create({
      data: { name: "Иван Смирнов", tutorId },
    });
    studentId = student.id;

    const studentUser = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Иван Смирнов",
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

    const unlinked = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Без репетитора",
        isEmailVerified: true,
      },
    });
    unlinkedStudentUserId = unlinked.id;
    unlinkedStudentToken = generateStudentToken({
      studentUserId: unlinkedStudentUserId,
      email: unlinked.email,
      isStudent: true,
      tokenVersion: unlinked.tokenVersion,
    });

    await prisma.callRecord.createMany({
      data: [
        {
          tutorId,
          studentId,
          callerKind: "TUTOR",
          status: "COMPLETED",
          startedAt: new Date("2026-06-03T10:00:00.000Z"),
          endedAt: new Date("2026-06-03T10:05:00.000Z"),
          durationSeconds: 300,
        },
        {
          tutorId,
          studentId,
          callerKind: "STUDENT",
          status: "MISSED",
          startedAt: new Date("2026-06-04T10:00:00.000Z"),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.studentUser.deleteMany({
      where: { id: { in: [studentUserId, unlinkedStudentUserId] } },
    });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({
      where: { id: { in: [tutorId, otherTutorId] } },
    });
    await prisma.$disconnect();
  });

  describe("GET /api/calls/history", () => {
    it("should return the tutor's records newest-first with derived direction/peerName", async () => {
      const res = await request(app)
        .get("/api/calls/history")
        .set("Authorization", `Bearer ${tutorToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0]).toMatchObject({
        status: "MISSED",
        direction: "incoming",
        peerName: "Иван Смирнов",
      });
      expect(res.body.items[1]).toMatchObject({
        status: "COMPLETED",
        direction: "outgoing",
        durationSeconds: 300,
      });
    });

    it("should return no records for a different tutor", async () => {
      const res = await request(app)
        .get("/api/calls/history")
        .set("Authorization", `Bearer ${otherTutorToken}`)
        .expect(200);
      expect(res.body.items).toHaveLength(0);
    });

    it("should return 401 without a token", async () => {
      await request(app).get("/api/calls/history").expect(401);
    });
  });

  describe("GET /api/student/calls/history", () => {
    it("should return the student's records with tutor as peerName and viewer-relative direction", async () => {
      const res = await request(app)
        .get("/api/student/calls/history")
        .set("Authorization", `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0]).toMatchObject({
        status: "MISSED",
        direction: "outgoing",
        peerName: "Анна Петрова",
      });
      expect(res.body.items[1]).toMatchObject({
        status: "COMPLETED",
        direction: "incoming",
        peerName: "Анна Петрова",
      });
    });

    it("should return an empty list for an unlinked student", async () => {
      const res = await request(app)
        .get("/api/student/calls/history")
        .set("Authorization", `Bearer ${unlinkedStudentToken}`)
        .expect(200);
      expect(res.body.items).toHaveLength(0);
    });

    it("should return 401 without a student token", async () => {
      await request(app).get("/api/student/calls/history").expect(401);
    });
  });
});

describe("Call history REST API: lesson of a call", () => {
  let tutorId: string;
  let tutorToken: string;
  let studentId: string;
  let studentUserId: string;
  let studentToken: string;
  let lessonId: string;
  let deletedLessonId: string;

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
    const lesson = await prisma.lesson.create({
      data: {
        tutorId,
        studentId,
        subject: "PHYSICS",
        startTime: new Date("2026-06-05T15:00:00.000Z"),
        endTime: new Date("2026-06-05T16:00:00.000Z"),
      },
    });
    lessonId = lesson.id;
    const deletedLesson = await prisma.lesson.create({
      data: {
        tutorId,
        studentId,
        startTime: new Date("2026-06-06T15:00:00.000Z"),
        endTime: new Date("2026-06-06T16:00:00.000Z"),
      },
    });
    deletedLessonId = deletedLesson.id;

    await prisma.callRecord.createMany({
      data: [
        {
          tutorId,
          studentId,
          lessonId,
          callerKind: "STUDENT",
          status: "COMPLETED",
          startedAt: new Date("2026-06-05T15:01:00.000Z"),
          endedAt: new Date("2026-06-05T15:31:00.000Z"),
          durationSeconds: 1800,
        },
        {
          tutorId,
          studentId,
          lessonId: deletedLessonId,
          callerKind: "TUTOR",
          status: "MISSED",
          startedAt: new Date("2026-06-06T15:01:00.000Z"),
        },
        {
          tutorId,
          studentId,
          callerKind: "TUTOR",
          status: "CANCELED",
          startedAt: new Date("2026-06-07T15:01:00.000Z"),
        },
      ],
    });
    await prisma.lesson.delete({ where: { id: deletedLessonId } });
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.lesson.deleteMany({ where: { tutorId } });
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
  });

  const expectedLesson = () => ({
    id: lessonId,
    subject: "PHYSICS",
    startTime: "2026-06-05T15:00:00.000Z",
    endTime: "2026-06-05T16:00:00.000Z",
  });

  it("should give the tutor the lesson of a lesson call and null otherwise", async () => {
    const res = await request(app)
      .get("/api/calls/history")
      .set("Authorization", `Bearer ${tutorToken}`)
      .expect(200);

    expect(res.body.items.map((item: { lesson: unknown }) => item.lesson)).toEqual([
      null,
      null,
      expectedLesson(),
    ]);
  });

  it("should give the student the lesson of a lesson call and null otherwise", async () => {
    const res = await request(app)
      .get("/api/student/calls/history")
      .set("Authorization", `Bearer ${studentToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(3);
    expect(res.body.items[2]).toMatchObject({ direction: "outgoing", lesson: expectedLesson() });
    expect(res.body.items[1]).toMatchObject({ status: "MISSED", lesson: null });
  });
});
