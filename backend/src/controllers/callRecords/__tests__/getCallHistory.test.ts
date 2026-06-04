import request from "supertest";
import { faker } from "@faker-js/faker";

import { app } from "../../../index";
import prisma from "../../../lib/prisma";
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
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Анна Петрова",
        isEmailVerified: true,
      },
    });
    tutorId = tutor.id;
    tutorToken = generateToken({ userId: tutor.id, email: tutor.email });

    const otherTutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
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
        email: faker.internet.email().toLowerCase(),
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
        email: faker.internet.email().toLowerCase(),
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
        status: "missed",
        direction: "incoming",
        peerName: "Иван Смирнов",
      });
      expect(res.body.items[1]).toMatchObject({
        status: "completed",
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
        status: "missed",
        direction: "outgoing",
        peerName: "Анна Петрова",
      });
      expect(res.body.items[1]).toMatchObject({
        status: "completed",
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
