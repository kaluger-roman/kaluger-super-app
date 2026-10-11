import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

type Range = { startDate: string; endDate: string };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const monthRange = (month: number): Range => ({
  startDate: new Date(Date.UTC(2026, month, 1)).toISOString(),
  endDate: new Date(Date.UTC(2026, month + 1, 0, 23, 59, 59)).toISOString(),
});

const MARCH = monthRange(2);
const FEBRUARY = monthRange(1);
const Q1: Range = {
  startDate: new Date(Date.UTC(2026, 0, 1)).toISOString(),
  endDate: new Date(Date.UTC(2026, 2, 31, 23, 59, 59)).toISOString(),
};

const utc = (month: number, day: number, hour = 10) => new Date(Date.UTC(2026, month, day, hour));

describe("GET /api/statistics with tax-exempt lessons", () => {
  let userId: string;
  let authToken: string;
  let studentId: string;

  const setTaxPeriods = async (periods: Array<{ startDate: Date; rate: number }>) => {
    await prisma.user.update({ where: { id: userId }, data: { taxEnabled: true } });
    await prisma.taxRatePeriod.createMany({
      data: periods.map((period) => ({ ...period, userId })),
    });
  };

  const createLesson = (data: {
    startTime: Date;
    price?: number;
    isPaid?: boolean;
    paymentDate?: Date | null;
    isTaxExempt?: boolean;
    status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
    studentId?: string | null;
    prospectName?: string;
  }) => {
    const isPaid = data.isPaid ?? true;
    return prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId: data.studentId === undefined ? studentId : data.studentId,
        prospectName: data.prospectName,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime: data.startTime,
        endTime: new Date(data.startTime.getTime() + HOUR_MS),
        price: data.price ?? 1000,
        status: data.status ?? "COMPLETED",
        isPaid,
        paymentDate: data.paymentDate === undefined && isPaid ? data.startTime : data.paymentDate,
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

  const putLesson = (id: string, body: Record<string, unknown>) =>
    request(app)
      .put(`/api/lessons/${id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send(body)
      .expect(200);

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `tax-exempt-stats-${randomUUID()}@test.local`, password: "x", name: "У" },
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

  it("should tax only taxable payments and report the tax-exempt sum", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    await createLesson({ startTime: utc(2, 10), price: 1000 });
    await createLesson({ startTime: utc(2, 11), price: 2000, isTaxExempt: true });

    const statistics = await getStatistics(MARCH);

    expect(statistics.taxAmount).toBe(60);
    expect(statistics.taxBreakdown).toEqual([{ rate: 6, earnings: 1000, tax: 60 }]);
    expect(statistics.taxExemptIncome).toBe(2000);
    expect(statistics.earnings).toBe(3000);
    expect(statistics.paymentsInRangeSum).toBe(3000);
  });

  it("should return taxExemptIncome 0 when there are no tax-exempt payments", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    await createLesson({ startTime: utc(2, 10), price: 1000 });
    await createLesson({ startTime: utc(2, 11), price: 2000 });

    const statistics = await getStatistics(MARCH);

    expect(statistics.taxAmount).toBe(180);
    expect(statistics.taxBreakdown).toEqual([{ rate: 6, earnings: 3000, tax: 180 }]);
    expect(statistics.taxExemptIncome).toBe(0);
  });

  it("should return taxExemptIncome null when tax accounting is disabled", async () => {
    await createLesson({ startTime: utc(2, 11), price: 2000, isTaxExempt: true });

    const statistics = await getStatistics(MARCH);

    expect(statistics.taxAmount).toBeNull();
    expect(statistics.taxBreakdown).toBeNull();
    expect(statistics.taxExemptIncome).toBeNull();
  });

  it("should keep tax-exempt payments out of every rate row", async () => {
    await setTaxPeriods([
      { startDate: utc(1, 1, 0), rate: 6 },
      { startDate: utc(2, 16, 0), rate: 13 },
    ]);
    await createLesson({ startTime: utc(0, 10), price: 1000 });
    await createLesson({ startTime: utc(0, 12), price: 500, isTaxExempt: true });
    await createLesson({ startTime: utc(1, 10), price: 1000 });
    await createLesson({ startTime: utc(1, 12), price: 2000, isTaxExempt: true });
    await createLesson({ startTime: utc(2, 20), price: 1000 });

    const statistics = await getStatistics(Q1);

    expect(statistics.taxBreakdown).toEqual([
      { rate: 0, earnings: 1000, tax: 0, isOutsidePeriods: true },
      { rate: 6, earnings: 1000, tax: 60 },
      { rate: 13, earnings: 1000, tax: 130 },
    ]);
    expect(statistics.taxAmount).toBe(190);
    expect(statistics.taxExemptIncome).toBe(2500);
  });

  it("should not tax an unpaid tax-exempt lesson and count it once it is paid", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    await createLesson({ startTime: utc(2, 10), price: 1000 });
    const exempt = await createLesson({
      startTime: utc(2, 11),
      price: 2000,
      isPaid: false,
      isTaxExempt: true,
    });

    expect(await getStatistics(MARCH)).toMatchObject({ taxAmount: 60, taxExemptIncome: 0 });

    await putLesson(exempt.id, { isPaid: true, paymentDate: utc(2, 12).toISOString() });

    expect(await getStatistics(MARCH)).toMatchObject({ taxAmount: 60, taxExemptIncome: 2000 });
  });

  it("should report zero tax and keep the rate row when every payment is tax-exempt", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    await createLesson({ startTime: utc(2, 11), price: 2000, isTaxExempt: true });

    const statistics = await getStatistics(MARCH);

    expect(statistics.taxAmount).toBe(0);
    expect(statistics.taxBreakdown).toEqual([{ rate: 6, earnings: 0, tax: 0 }]);
    expect(statistics.taxExemptIncome).toBe(2000);
  });

  it("should recalculate a past period when the flag is set and removed", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    await createLesson({ startTime: utc(1, 5), price: 1000 });
    const lesson = await createLesson({ startTime: utc(1, 10), price: 1500 });

    const before = await getStatistics(FEBRUARY);
    expect(before.taxAmount).toBe(150);

    await putLesson(lesson.id, { isTaxExempt: true });
    expect(await getStatistics(FEBRUARY)).toMatchObject({ taxAmount: 60, taxExemptIncome: 1500 });

    await putLesson(lesson.id, { isTaxExempt: false });
    expect(await getStatistics(FEBRUARY)).toMatchObject({
      taxAmount: before.taxAmount,
      taxBreakdown: before.taxBreakdown,
      taxExemptIncome: 0,
    });
  });

  it("should follow payment date changes, unpaying and deletion", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    const lesson = await createLesson({ startTime: utc(2, 10), price: 2000, isTaxExempt: true });

    await putLesson(lesson.id, { paymentDate: utc(1, 20).toISOString() });
    expect((await getStatistics(MARCH)).taxExemptIncome).toBe(0);
    expect((await getStatistics(FEBRUARY)).taxExemptIncome).toBe(2000);

    await putLesson(lesson.id, { isPaid: false, paymentDate: null });
    expect((await getStatistics(FEBRUARY)).taxExemptIncome).toBe(0);

    await putLesson(lesson.id, { isPaid: true, paymentDate: utc(2, 11).toISOString() });
    expect((await getStatistics(MARCH)).taxExemptIncome).toBe(2000);

    await request(app)
      .delete(`/api/lessons/${lesson.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);
    expect((await getStatistics(MARCH)).taxExemptIncome).toBe(0);
  });

  it("should not change any non-tax indicator when lessons are marked", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    const now = Date.now();
    const lastMonth = new Date();
    lastMonth.setUTCDate(1);
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    lastMonth.setUTCDate(12);
    lastMonth.setUTCHours(10, 0, 0, 0);

    await createLesson({ startTime: lastMonth, price: 1100 });
    await createLesson({ startTime: new Date(now - 5 * DAY_MS), price: 1000 });
    await createLesson({ startTime: new Date(now - 3 * DAY_MS), price: 800, isPaid: false });
    await createLesson({
      startTime: new Date(now - 2 * DAY_MS),
      price: 900,
      isPaid: false,
      status: "CANCELLED",
    });
    await createLesson({
      startTime: new Date(now + 5 * DAY_MS),
      price: 1200,
      paymentDate: new Date(now - HOUR_MS),
      status: "SCHEDULED",
    });
    await createLesson({
      startTime: new Date(now + 6 * DAY_MS),
      price: 700,
      isPaid: false,
      status: "SCHEDULED",
    });
    await createLesson({
      startTime: new Date(now + 7 * DAY_MS),
      price: 0,
      isPaid: false,
      status: "SCHEDULED",
      studentId: null,
      prospectName: "Пробный",
    });
    const range: Range = {
      startDate: new Date(now - 60 * DAY_MS).toISOString(),
      endDate: new Date(now + 30 * DAY_MS).toISOString(),
    };

    const before = await getStatistics(range);
    await prisma.lesson.updateMany({ where: { tutorId: userId }, data: { isTaxExempt: true } });
    const after = await getStatistics(range);

    const taxKeys = ["taxAmount", "taxBreakdown", "taxExemptIncome"];
    const nonTax = (statistics: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(statistics).filter(([key]) => !taxKeys.includes(key)));
    expect(nonTax(after)).toEqual(nonTax(before));
    expect(before.paymentsInRangeSum).toBeGreaterThan(0);
    expect(before.unpaidDebtSum).toBe(800);
    expect(before.lostEarnings).toBe(900);
    expect(before.prepaidIncome).toBe(1200);
    expect(before.taxExemptIncome).toBe(0);
    expect(after.taxAmount).toBe(0);
    expect(after.taxExemptIncome).toBe(before.paymentsInRangeSum);
  });

  it("should keep commission credits and totals unchanged for a tax-exempt lesson", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    await prisma.student.update({ where: { id: studentId }, data: { commissionAmount: 1500 } });
    const first = await createLesson({ startTime: utc(2, 3), price: 1000 });
    await createLesson({ startTime: utc(2, 10), price: 1000 });

    const fetchCredits = async () => {
      const res = await request(app)
        .get("/api/lessons?noPagination=true")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
      return res.body.lessons.map((lesson: { id: string; commissionCredit?: unknown }) => [
        lesson.id,
        lesson.commissionCredit,
      ]);
    };

    const statsBefore = await getStatistics(MARCH);
    const creditsBefore = await fetchCredits();

    await putLesson(first.id, { isTaxExempt: true });

    const statsAfter = await getStatistics(MARCH);
    expect(statsBefore.commissionWrittenOffSum).toBe(1500);
    expect(statsAfter.commissionWrittenOffSum).toBe(statsBefore.commissionWrittenOffSum);
    expect(statsAfter.commissionRemainingTotal).toBe(statsBefore.commissionRemainingTotal);
    expect(await fetchCredits()).toEqual(creditsBefore);
  });

  it("should tax a payment transferred from a cancelled tax-exempt lesson", async () => {
    await setTaxPeriods([{ startDate: utc(0, 1, 0), rate: 6 }]);
    const now = Date.now();
    const paid = await createLesson({
      startTime: new Date(now + 5 * DAY_MS),
      paymentDate: new Date(now - DAY_MS),
      status: "SCHEDULED",
      isTaxExempt: true,
    });
    await createLesson({
      startTime: new Date(now + 6 * DAY_MS),
      isPaid: false,
      status: "SCHEDULED",
    });
    const range: Range = {
      startDate: new Date(now - 3 * DAY_MS).toISOString(),
      endDate: new Date(now + 30 * DAY_MS).toISOString(),
    };
    expect(await getStatistics(range)).toMatchObject({ taxAmount: 0, taxExemptIncome: 1000 });

    await putLesson(paid.id, { status: "CANCELLED" });

    expect(await getStatistics(range)).toMatchObject({ taxAmount: 60, taxExemptIncome: 0 });
  });
});
