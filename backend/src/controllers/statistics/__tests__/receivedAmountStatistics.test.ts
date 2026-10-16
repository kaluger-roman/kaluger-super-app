import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

type Range = { startDate: string; endDate: string };
type LessonStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

const HOUR_MS = 60 * 60 * 1000;

const MARCH: Range = {
  startDate: new Date(Date.UTC(2026, 2, 1)).toISOString(),
  endDate: new Date(Date.UTC(2026, 2, 31, 23, 59, 59)).toISOString(),
};

const march = (day: number, hour = 10) => new Date(Date.UTC(2026, 2, day, hour));

const middleOfLastMonth = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15, 10));
};

describe("GET /api/statistics with received amounts", () => {
  let userId: string;
  let authToken: string;
  let studentId: string;

  const enableTax = async (rate = 6) => {
    await prisma.user.update({ where: { id: userId }, data: { taxEnabled: true } });
    await prisma.taxRatePeriod.create({
      data: { userId, startDate: new Date(Date.UTC(2026, 0, 1)), rate },
    });
  };

  const createLesson = (data: {
    startTime: Date;
    price?: number | null;
    status?: LessonStatus;
    isPaid?: boolean;
    paymentDate?: Date | null;
    receivedAmount?: number;
    isTaxExempt?: boolean;
  }) => {
    const isPaid = data.isPaid ?? false;
    const price = data.price === undefined ? 2000 : data.price;
    return prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: data.startTime,
        endTime: new Date(data.startTime.getTime() + HOUR_MS),
        price,
        status: data.status ?? "COMPLETED",
        isPaid,
        paymentDate: data.paymentDate === undefined && isPaid ? data.startTime : data.paymentDate,
        receivedAmount: isPaid ? (data.receivedAmount ?? price ?? 0) : null,
        isTaxExempt: data.isTaxExempt ?? false,
      },
    });
  };

  const getStatistics = async (range: Range) => {
    const res = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${authToken}`)
      .query(range)
      .expect(200);
    return res.body;
  };

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `received-stats-${randomUUID()}@test.local`, password: "x", name: "У" },
    });
    userId = user.id;
    authToken = generateToken({ userId: user.id, email: user.email });
    const student = await prisma.student.create({
      data: { name: "Ученик", contactMethod: "WHATSAPP", tutorId: userId },
    });
    studentId = student.id;
  });

  afterEach(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.taxRatePeriod.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should count received money by the received amount", async () => {
    await enableTax();
    await createLesson({ startTime: march(10), isPaid: true, receivedAmount: 1800 });
    await createLesson({
      startTime: march(11),
      price: 1000,
      isPaid: true,
      receivedAmount: 700,
      isTaxExempt: true,
    });
    await createLesson({
      startTime: march(20),
      status: "SCHEDULED",
      isPaid: true,
      paymentDate: march(5, 0),
      receivedAmount: 1500,
    });
    await createLesson({
      startTime: middleOfLastMonth(),
      isPaid: true,
      receivedAmount: 1700,
    });

    const statistics = await getStatistics(MARCH);

    expect(statistics.earnings).toBe(2500);
    expect(statistics.lastMonthEarnings).toBe(1700);
    expect(statistics.prepaidIncome).toBe(1500);
    expect(statistics.paymentsInRangeSum).toBe(4000);
    expect(statistics.paymentsInRangeCount).toBe(3);
    expect(statistics.taxAmount).toBe(198);
    expect(statistics.taxBreakdown).toEqual([{ rate: 6, earnings: 3300, tax: 198 }]);
    expect(statistics.taxExemptIncome).toBe(700);
  });

  it("should count money that has not arrived by the lesson price", async () => {
    await createLesson({ startTime: march(3), price: 1200 });
    await createLesson({ startTime: march(4), status: "CANCELLED", price: 900 });
    await createLesson({
      startTime: march(6),
      status: "CANCELLED",
      price: 900,
      isPaid: true,
      paymentDate: null,
      receivedAmount: 500,
    });
    await createLesson({ startTime: march(20), status: "SCHEDULED", price: 2500 });
    await createLesson({
      startTime: march(21),
      status: "SCHEDULED",
      isPaid: true,
      paymentDate: march(5, 0),
      receivedAmount: 1500,
    });
    await createLesson({ startTime: march(22), status: "SCHEDULED", price: 0 });

    const statistics = await getStatistics(MARCH);

    expect(statistics.unpaidDebtSum).toBe(1200);
    expect(statistics.unpaidDebtCount).toBe(1);
    expect(statistics.unpaidDebtOver24hSum).toBe(1200);
    // The paid cancelled lesson kept its money, so only the unpaid one is lost.
    expect(statistics.lostEarnings).toBe(900);
    expect(statistics.upcomingIncome).toBe(4500);
    expect(statistics.trialLessonsCount).toBe(1);
  });

  it("should not turn an underpayment into a debt", async () => {
    await createLesson({ startTime: march(10), isPaid: true, receivedAmount: 1800 });

    const statistics = await getStatistics(MARCH);

    expect(statistics.unpaidDebtSum).toBe(0);
    expect(statistics.unpaidDebtCount).toBe(0);
    expect(statistics.unpaidDebtOver24hSum).toBe(0);
    expect(statistics.earnings).toBe(1800);
  });

  it("should keep every figure equal to the price-based value when received equals price", async () => {
    await enableTax();
    await createLesson({ startTime: march(10), price: 2000, isPaid: true });
    await createLesson({ startTime: march(11), price: 1000, isPaid: true, isTaxExempt: true });
    await createLesson({
      startTime: march(20),
      status: "SCHEDULED",
      price: 1500,
      isPaid: true,
      paymentDate: march(5, 0),
    });
    await createLesson({ startTime: march(3), price: 1200 });
    await createLesson({ startTime: march(4), status: "CANCELLED", price: 900 });

    const statistics = await getStatistics(MARCH);

    expect(statistics).toMatchObject({
      earnings: 3000,
      prepaidIncome: 1500,
      paymentsInRangeSum: 4500,
      paymentsInRangeCount: 3,
      taxAmount: 210,
      taxBreakdown: [{ rate: 6, earnings: 3500, tax: 210 }],
      taxExemptIncome: 1000,
      unpaidDebtSum: 1200,
      lostEarnings: 900,
      upcomingIncome: 1500,
      trialLessonsCount: 0,
    });
  });

  it("should leave received-money figures unchanged when the price of a paid lesson changes", async () => {
    await enableTax();
    await prisma.student.update({ where: { id: studentId }, data: { commissionAmount: 5000 } });
    const lesson = await createLesson({ startTime: march(10), isPaid: true });
    await createLesson({ startTime: march(12), isPaid: true, isTaxExempt: true });

    const before = await getStatistics(MARCH);

    await request(app)
      .put(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ price: 2500 })
      .expect(200);

    const after = await getStatistics(MARCH);

    expect(after.earnings).toBe(before.earnings);
    expect(after.paymentsInRangeSum).toBe(before.paymentsInRangeSum);
    expect(after.taxAmount).toBe(before.taxAmount);
    expect(after.taxBreakdown).toEqual(before.taxBreakdown);
    expect(after.taxExemptIncome).toBe(before.taxExemptIncome);
    expect(after.commissionWrittenOffSum).toBe(before.commissionWrittenOffSum);
    expect(after.commissionWrittenOffSum).toBe(4000);
  });
});
