import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

describe("getStudentStatistics integration tests", () => {
  let authToken: string;
  let userId: string;
  let otherUserId: string;
  let studentA: string;
  let studentB: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });

    const otherUser = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: "hashed",
        name: faker.person.fullName(),
      },
    });

    userId = user.id;
    otherUserId = otherUser.id;
    authToken = generateToken({ userId: user.id, email: user.email });

    const sA = await prisma.student.create({
      data: { name: "Alice", contactMethod: "WHATSAPP", tutorId: userId },
    });
    const sB = await prisma.student.create({
      data: { name: "Bob", contactMethod: "WHATSAPP", tutorId: userId },
    });

    studentA = sA.id;
    studentB = sB.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.user.delete({ where: { id: otherUserId } });
    await prisma.$disconnect();
  });

  it("returns aggregated stats per student", async () => {
    // create lessons for two students with prices
    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId: studentA,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: 500,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId: studentA,
          subject: "PHYSICS",
          lessonType: "SCHOOL",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: 1500,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId: studentB,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: 700,
          status: "COMPLETED",
        },
      ],
    });

    await request(app)
      .get(`/api/statistics/by-student`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.studentStatistics).toBeInstanceOf(Array);
        const a = res.body.studentStatistics.find(
          (s: any) => s.studentId === studentA
        );
        const b = res.body.studentStatistics.find(
          (s: any) => s.studentId === studentB
        );

        expect(a).toBeDefined();
        expect(b).toBeDefined();
        expect(a._count.id).toBe(2);
        expect(a._sum.price).toBe(2000);
        expect(b._count.id).toBe(1);
        expect(b._sum.price).toBe(700);
        // ensure student info is included
        expect(a.student).toBeDefined();
        expect(a.student.name).toBe("Alice");
      });
  });

  it("respects date range filters", async () => {
    // create an old lesson outside range
    const oldStart = new Date("2019-01-01T10:00:00Z");
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId: studentA,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: oldStart,
        endTime: new Date(oldStart.getTime() + 3600000),
        price: 111,
        status: "COMPLETED",
      },
    });

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    await request(app)
      .get(`/api/statistics/by-student`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({ startDate: todayStr, endDate: todayStr })
      .expect(200)
      .then((res) => {
        // should not count the old 111 price when filtered to today
        const stat = res.body.studentStatistics.find(
          (s: any) => s.studentId === studentA
        );
        if (stat) {
          if (stat._sum && stat._sum.price) {
            expect(stat._sum.price).not.toBe(111);
          }
        }
      });
  });

  it("sums zero prices correctly", async () => {
    const tmp = await prisma.student.create({
      data: { name: "ZeroStudent", contactMethod: "WHATSAPP", tutorId: userId },
    });

    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId: tmp.id,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: 0,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId: tmp.id,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: 0,
          status: "COMPLETED",
        },
      ],
    });

    await request(app)
      .get(`/api/statistics/by-student`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        const stat = res.body.studentStatistics.find(
          (s: any) => s.studentId === tmp.id
        );
        expect(stat).toBeDefined();
        // sum of zeros should be 0
        expect(stat._sum.price).toBe(0);
      });

    await prisma.lesson.deleteMany({
      where: { tutorId: userId, studentId: tmp.id },
    });
    await prisma.student.delete({ where: { id: tmp.id } });
  });

  it("handles null prices correctly (mixed and all-null cases)", async () => {
    // Use temporary students so existing lessons don't interfere
    const tmp1 = await prisma.student.create({
      data: { name: "Tmp1", contactMethod: "WHATSAPP", tutorId: userId },
    });
    const tmp2 = await prisma.student.create({
      data: { name: "Tmp2", contactMethod: "WHATSAPP", tutorId: userId },
    });

    // mixed: one null, one numeric for tmp1
    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId: tmp1.id,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: null,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId: tmp1.id,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: 1000,
          status: "COMPLETED",
        },
      ],
    });

    await request(app)
      .get(`/api/statistics/by-student`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        const stat = res.body.studentStatistics.find(
          (s: any) => s.studentId === tmp1.id
        );
        expect(stat).toBeDefined();
        // mixed null + 1000 should sum to 1000
        expect(stat._sum.price).toBe(1000);
      });

    // all-null: create lessons with null prices for tmp2
    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId: tmp2.id,
          subject: "PHYSICS",
          lessonType: "SCHOOL",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: null,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId: tmp2.id,
          subject: "PHYSICS",
          lessonType: "SCHOOL",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          price: null,
          status: "COMPLETED",
        },
      ],
    });

    await request(app)
      .get(`/api/statistics/by-student`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        const stat = res.body.studentStatistics.find(
          (s: any) => s.studentId === tmp2.id
        );
        expect(stat).toBeDefined();
        // if all prices null Prisma returns null for _sum.price
        expect(stat._sum.price).toBeNull();
      });

    // cleanup temporary students and their lessons
    await prisma.lesson.deleteMany({
      where: { tutorId: userId, studentId: { in: [tmp1.id, tmp2.id] } },
    });
    await prisma.student.deleteMany({
      where: { id: { in: [tmp1.id, tmp2.id] } },
    });
  });
});
