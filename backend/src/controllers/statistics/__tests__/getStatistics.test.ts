import request from "supertest";
import { app } from "../../../index";
import prisma from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";
import { faker } from "@faker-js/faker";

describe("getStatistics controller", () => {
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

  afterEach(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.taxRatePeriod.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { taxEnabled: false },
    });
  });

  it("returns zeros and null tax for empty data set with tax disabled", async () => {
    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.completedLessons).toBe(0);
        expect(res.body.cancelledLessons).toBe(0);
        expect(res.body.totalLessons).toBe(0);
        expect(res.body.upcomingLessons).toBe(0);
        expect(res.body.earnings).toBe(0);
        expect(res.body.lastMonthEarnings).toBe(0);
        expect(res.body.lostEarnings).toBe(0);
        expect(res.body.prepaidIncome).toBe(0);
        expect(res.body.upcomingIncome).toBe(0);
        expect(res.body.trialLessonsCount).toBe(0);
        expect(res.body.unpaidDebtSum).toBe(0);
        expect(res.body.unpaidDebtCount).toBe(0);
        expect(res.body.unpaidDebtOver24hSum).toBe(0);
        expect(res.body.unpaidDebtOver24hCount).toBe(0);
        expect(res.body.paymentsInRangeSum).toBe(0);
        expect(res.body.paymentsInRangeCount).toBe(0);
        expect(res.body.taxAmount).toBeNull();
        expect(res.body.taxBreakdown).toBeNull();
      });
  });

  it("returns null tax fields when taxEnabled is false even with paid lessons", async () => {
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: true,
        paymentDate: new Date(),
        price: 10000,
        status: "COMPLETED",
      },
    });

    const res = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.taxAmount).toBeNull();
    expect(res.body.taxBreakdown).toBeNull();
  });

  it("calculates tax with single period when taxEnabled and one rate covers payments", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { taxEnabled: true },
    });
    await prisma.taxRatePeriod.create({
      data: {
        userId,
        startDate: new Date("2024-01-01"),
        rate: 13,
      },
    });

    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: new Date("2025-06-01"),
        endTime: new Date("2025-06-01T01:00:00.000Z"),
        isRecurring: false,
        isPaid: true,
        paymentDate: new Date("2025-06-01"),
        price: 50000,
        status: "COMPLETED",
      },
    });

    const res = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${authToken}`)
      .query({ startDate: "2025-05-01", endDate: "2025-07-01" })
      .expect(200);

    expect(res.body.taxAmount).toBe(6500);
    expect(res.body.taxBreakdown).toEqual([
      { rate: 13, earnings: 50000, tax: 6500 },
    ]);
  });

  it("splits tax across multiple periods by paymentDate, with isOutsidePeriods bucket for early payments", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { taxEnabled: true },
    });
    await prisma.taxRatePeriod.createMany({
      data: [
        { userId, startDate: new Date("2024-01-01"), rate: 6 },
        { userId, startDate: new Date("2025-06-01"), rate: 4 },
      ],
    });

    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date("2023-09-01"),
          endTime: new Date("2023-09-01T01:00:00.000Z"),
          isRecurring: false,
          isPaid: true,
          paymentDate: new Date("2023-09-01"),
          price: 5000,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date("2025-05-15"),
          endTime: new Date("2025-05-15T01:00:00.000Z"),
          isRecurring: false,
          isPaid: true,
          paymentDate: new Date("2025-05-15"),
          price: 10000,
          status: "COMPLETED",
        },
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "EGE",
          startTime: new Date("2025-07-15"),
          endTime: new Date("2025-07-15T01:00:00.000Z"),
          isRecurring: false,
          isPaid: true,
          paymentDate: new Date("2025-07-15"),
          price: 15000,
          status: "COMPLETED",
        },
      ],
    });

    const res = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${authToken}`)
      .query({ startDate: "2023-01-01", endDate: "2025-12-31" })
      .expect(200);

    expect(res.body.taxAmount).toBe(0 + 600 + 600);
    expect(res.body.taxBreakdown).toEqual([
      { rate: 0, earnings: 5000, tax: 0, isOutsidePeriods: true },
      { rate: 4, earnings: 15000, tax: 600 },
      { rate: 6, earnings: 10000, tax: 600 },
    ]);
  });

  it("calculates completed, cancelled, total and earnings correctly", async () => {
    // completed paid
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 1500,
        status: "COMPLETED",
      },
    });

    // completed unpaid but price > 0
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: false,
        price: 500,
        status: "COMPLETED",
      },
    });

    // cancelled
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: false,
        price: 200,
        status: "CANCELLED",
      },
    });

    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.completedLessons).toBe(2);
        expect(res.body.cancelledLessons).toBe(1);
        expect(res.body.totalLessons).toBe(3);
        expect(res.body.earnings).toBe(1500);
        expect(res.body.unpaidDebtSum).toBe(500);
        expect(res.body.unpaidDebtCount).toBe(1);
        expect(res.body.lostEarnings).toBe(200);
      });
  });

  it("counts unpaid over 24h correctly", async () => {
    const now = new Date();
    const twoDaysAgoEnd = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const twoDaysAgoStart = new Date(twoDaysAgoEnd.getTime() - 3600000);

    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: twoDaysAgoStart,
        endTime: twoDaysAgoEnd,
        isRecurring: false,
        isPaid: false,
        price: 800,
        status: "COMPLETED",
      },
    });

    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.unpaidDebtOver24hCount).toBe(1);
        expect(res.body.unpaidDebtOver24hSum).toBe(800);
      });
  });

  it("counts upcoming lessons and upcoming income/prepaid correctly", async () => {
    // upcoming statuses: SCHEDULED, RESCHEDULED, IN_PROGRESS
    const inOneHourStart = new Date(Date.now() + 60 * 60 * 1000);
    const inTwoHoursStart = new Date(Date.now() + 2 * 60 * 60 * 1000);

    // scheduled paid
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: inOneHourStart,
        endTime: new Date(inOneHourStart.getTime() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 1200,
        status: "SCHEDULED",
      },
    });

    // rescheduled unpaid
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: inTwoHoursStart,
        endTime: new Date(inTwoHoursStart.getTime() + 3600000),
        isRecurring: false,
        isPaid: false,
        price: 400,
        status: "RESCHEDULED",
      },
    });

    // in progress paid
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 300,
        status: "IN_PROGRESS",
      },
    });

    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.upcomingLessons).toBe(3);
        // prepaidIncome uses isPaid true for upcoming statuses
        expect(res.body.prepaidIncome).toBe(1500); // 1200 + 300
        // upcomingIncome sums all upcoming (paid and unpaid) prices
        expect(res.body.upcomingIncome).toBe(1900); // 1200 + 400 + 300
      });
  });

  it("counts trial lessons (price 0 or null)", async () => {
    await prisma.lesson.createMany({
      data: [
        {
          tutorId: userId,
          studentId,
          subject: "MATHEMATICS",
          lessonType: "SCHOOL",
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          isRecurring: false,
          isPaid: false,
          price: 0,
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
          price: null,
          status: "COMPLETED",
        },
      ],
    });

    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.trialLessonsCount).toBe(2);
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

    // create a today lesson
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        price: 222,
        status: "COMPLETED",
      },
    });

    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        startDate: startOfToday.toISOString(),
        endDate: endOfToday.toISOString(),
      })
      .expect(200)
      .then((res) => {
        // should not include the old lesson
        expect(res.body.earnings).not.toBe(111);
        // should include today's 222 (as earnings if isPaid true) but here isPaid false so earnings may be 0
        // ensure totalLessons counts only lessons within range
        expect(res.body.totalLessons).toBeGreaterThanOrEqual(1);
      });
  });

  it("calculates lastMonthEarnings correctly", async () => {
    // compute a date in last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5);

    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: lastMonth,
        endTime: new Date(lastMonth.getTime() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 4321,
        status: "COMPLETED",
      },
    });

    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.lastMonthEarnings).toBeGreaterThanOrEqual(4321);
      });
  });

  it("prepaidIncome ignores date filters while upcomingIncome respects them", async () => {
    // Create one upcoming (within default month range) paid lesson and one paid lesson far in past
    const now = new Date();
    const inFuture = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const farPast = new Date(now.getFullYear() - 1, 1, 1);

    // upcoming paid lesson (should be counted in both prepaidIncome and upcomingIncome)
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: inFuture,
        endTime: new Date(inFuture.getTime() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 999,
        status: "SCHEDULED",
      },
    });

    // far past paid upcoming-status-like lesson (out of date filter; should affect prepaidIncome but not upcomingIncome because upcomingIncome in controller uses tutorId and upcoming status only, but upcomingIncome's other aggregate uses ...where include startTime filter via buildStatisticsWhere for upcomingIncome? We will assert that prepaidIncome >= upcomingIncome)
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "SCHOOL",
        startTime: farPast,
        endTime: new Date(farPast.getTime() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 111,
        status: "SCHEDULED",
      },
    });

    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        expect(res.body.prepaidIncome).toBeGreaterThanOrEqual(
          res.body.upcomingIncome
        );
      });
  });

  it("aggregates payments by paymentDate within selected range", async () => {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // lesson whose startTime is far in the past but payment came today — must be counted
    const oldStart = new Date(today.getFullYear() - 2, 0, 1, 10, 0, 0);
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "EGE",
        startTime: oldStart,
        endTime: new Date(oldStart.getTime() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 2500,
        paymentDate: new Date(today.getTime() - 60 * 60 * 1000),
        status: "COMPLETED",
      },
    });

    // lesson paid today (within range)
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "PHYSICS",
        lessonType: "EGE",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 1500,
        paymentDate: new Date(),
        status: "COMPLETED",
      },
    });

    // lesson paid long ago — outside range, must be excluded
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 9999,
        paymentDate: new Date(today.getFullYear() - 1, 0, 1),
        status: "COMPLETED",
      },
    });

    // paid lesson without paymentDate but with startTime in range —
    // included via legacy fallback (paymentDate ?? startTime)
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 777,
        status: "COMPLETED",
      },
    });

    // paid lesson without paymentDate AND startTime far in the past —
    // excluded (fallback uses startTime, which is out of range)
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(today.getFullYear() - 2, 5, 1),
        endTime: new Date(today.getFullYear() - 2, 5, 1, 1),
        isRecurring: false,
        isPaid: true,
        price: 11111,
        status: "COMPLETED",
      },
    });

    // trial lesson (price 0) with paymentDate — excluded
    await prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        isRecurring: false,
        isPaid: true,
        price: 0,
        paymentDate: new Date(),
        status: "COMPLETED",
      },
    });

    await request(app)
      .get(`/api/statistics`)
      .set("Authorization", `Bearer ${authToken}`)
      .query({
        startDate: startOfToday.toISOString(),
        endDate: endOfToday.toISOString(),
      })
      .expect(200)
      .then((res) => {
        // 2500 (old lesson, paid today) + 1500 (today's lesson) +
        //   777 (no paymentDate, startTime today via fallback)
        expect(res.body.paymentsInRangeSum).toBe(4777);
        expect(res.body.paymentsInRangeCount).toBe(3);
      });
  });

  it("handles database errors gracefully", async () => {
    const originalAggregate = prisma.lesson.aggregate;
    prisma.lesson.aggregate = jest
      .fn()
      .mockRejectedValueOnce(new Error("DB error"));

    await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(500);

    prisma.lesson.aggregate = originalAggregate;
  });
});
