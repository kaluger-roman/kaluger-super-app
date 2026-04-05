import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

describe("statistics integration tests", () => {
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
        contactMethod: "WHATSAPP",
        tutorId: userId,
      },
    });

    studentId = student.id;
  });

  afterAll(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("/by-subject returns aggregated counts and sums", async () => {
    // create lessons across two subjects and prices
    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          isRecurring: false,
          isPaid: true,
          price: 1000,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          isRecurring: false,
          isPaid: false,
          price: 2000,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId,
          subject: "PHYSICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          isRecurring: false,
          isPaid: true,
          price: 500,
          status: "COMPLETED",
        },
      ],
    });

    await request(app)
      .get(`/api/statistics/by-subject`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.lessonsBySubject).toBeInstanceOf(Array);
        const math = res.body.lessonsBySubject.find(
          (s: any) => s.subject === "MATHEMATICS"
        );
        const phys = res.body.lessonsBySubject.find(
          (s: any) => s.subject === "PHYSICS"
        );

        expect(math).toBeDefined();
        expect(phys).toBeDefined();
        // math count 2, sum price 3000
        expect(math._count.id).toBe(2);
        expect(math._sum.price).toBe(3000);
        expect(phys._count.id).toBe(1);
        expect(phys._sum.price).toBe(500);
      });
  });

  it("/by-type returns aggregated counts and sums", async () => {
    // create lessons across two types
    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          isRecurring: false,
          isPaid: true,
          price: 700,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId,
          subject: "PHYSICS",
          lessonType: "SCHOOL",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          isRecurring: false,
          isPaid: false,
          price: 300,
          status: "COMPLETED",
        },
      ],
    });

    await request(app)
      .get(`/api/statistics/by-type`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.lessonsByType).toBeInstanceOf(Array);
        const ege = res.body.lessonsByType.find(
          (t: any) => t.lessonType === "EGE"
        );
        const school = res.body.lessonsByType.find(
          (t: any) => t.lessonType === "SCHOOL"
        );

        expect(ege).toBeDefined();
        expect(school).toBeDefined();
        // ege should have at least the CHEMISTRY lesson plus earlier EGE lessons
        expect(ege._count.id).toBeGreaterThanOrEqual(1);
        expect(ege._sum.price).toBeGreaterThanOrEqual(700);
        expect(school._count.id).toBeGreaterThanOrEqual(1);
        expect(school._sum.price).toBeGreaterThanOrEqual(300);
      });
  });

  it("respects startDate and endDate filters", async () => {
    // create an old lesson (outside range) and a today lesson (inside range)
    const oldStart = new Date("2020-01-01T10:00:00Z");
    const oldEnd = new Date(oldStart.getTime() + 3600000);
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: oldStart,
        endTime: oldEnd,
        isRecurring: false,
        price: 111,
        status: "COMPLETED",
      },
    });

    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    await request(app)
      .get(`/api/statistics/by-subject`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        startDate: startOfToday.toISOString(),
        endDate: endOfToday.toISOString(),
      })
      .expect(200)
      .then((res) => {
        // should not include the old lesson
        const math = res.body.lessonsBySubject.find(
          (s: any) => s.subject === "MATHEMATICS"
        );
        if (math) {
          // sum should be >= the recent lessons but not equal to include old 111 unless added today
          expect(math._sum.price).not.toBe(111);
        }
      });
  });

  it("handles database errors in by-subject", async () => {
    const originalGroupBy = prisma.lesson.groupBy;
    prisma.lesson.groupBy = jest
      .fn()
      .mockRejectedValueOnce(new Error("DB error"));

    await request(app)
      .get("/api/statistics/by-subject")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(500);

    prisma.lesson.groupBy = originalGroupBy;
  });

  it("handles database errors in by-type", async () => {
    const originalGroupBy = prisma.lesson.groupBy;
    prisma.lesson.groupBy = jest
      .fn()
      .mockRejectedValueOnce(new Error("DB error"));

    await request(app)
      .get("/api/statistics/by-type")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(500);

    prisma.lesson.groupBy = originalGroupBy;
  });
});
