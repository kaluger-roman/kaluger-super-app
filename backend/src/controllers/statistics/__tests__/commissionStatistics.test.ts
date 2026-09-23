import request from "supertest";
import { faker } from "@faker-js/faker";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

const MARCH_RANGE = {
  startDate: new Date(Date.UTC(2026, 2, 1, 0, 0, 0)).toISOString(),
  endDate: new Date(Date.UTC(2026, 2, 31, 23, 59, 59)).toISOString(),
};

const APRIL_RANGE = {
  startDate: new Date(Date.UTC(2026, 3, 1, 0, 0, 0)).toISOString(),
  endDate: new Date(Date.UTC(2026, 3, 30, 23, 59, 59)).toISOString(),
};

describe("commission statistics", () => {
  let authToken: string;
  let userId: string;

  const createStudent = (commissionAmount: number, archived = false) =>
    prisma.student.create({
      data: {
        name: faker.person.fullName(),
        contactMethod: "WHATSAPP",
        commissionAmount,
        archived,
        tutorId: userId,
      },
    });

  const createLesson = ({
    studentId,
    month,
    day,
    price = 1000,
    isPaid = true,
    paymentMonth,
    paymentDay,
  }: {
    studentId: string;
    month: number;
    day: number;
    price?: number;
    isPaid?: boolean;
    paymentMonth?: number;
    paymentDay?: number;
  }) =>
    prisma.lesson.create({
      data: {
        tutorId: userId,
        studentId,
        startTime: new Date(Date.UTC(2026, month, day, 10, 0, 0)),
        endTime: new Date(Date.UTC(2026, month, day, 11, 0, 0)),
        price,
        status: isPaid ? "COMPLETED" : "SCHEDULED",
        isPaid,
        ...(isPaid
          ? {
              paymentDate: new Date(
                Date.UTC(2026, paymentMonth ?? month, paymentDay ?? day, 12, 0, 0)
              ),
            }
          : {}),
      },
    });

  const getStatistics = async (range: { startDate: string; endDate: string }) => {
    const response = await request(app)
      .get(`/api/statistics?startDate=${range.startDate}&endDate=${range.endDate}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    return response.body;
  };

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
  });

  afterEach(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("should report no commission indicators when no student has a commission", async () => {
    const student = await createStudent(0);
    await createLesson({ studentId: student.id, month: 2, day: 1 });

    const statistics = await getStatistics(MARCH_RANGE);

    expect(statistics.hasCommissionStudents).toBe(false);
    expect(statistics.commissionWrittenOffSum).toBe(0);
    expect(statistics.commissionRemainingTotal).toBe(0);
  });

  it("should sum the written-off commission for the selected period", async () => {
    const first = await createStudent(2500);
    const second = await createStudent(2000);
    await createLesson({ studentId: first.id, month: 2, day: 1 });
    await createLesson({ studentId: first.id, month: 2, day: 2 });
    await createLesson({ studentId: second.id, month: 2, day: 3, price: 2000 });

    const statistics = await getStatistics(MARCH_RANGE);

    expect(statistics.hasCommissionStudents).toBe(true);
    expect(statistics.commissionWrittenOffSum).toBe(4000);
  });

  it("should recalculate the written-off sum when the period changes", async () => {
    const student = await createStudent(3000);
    await createLesson({ studentId: student.id, month: 2, day: 5 });
    await createLesson({ studentId: student.id, month: 3, day: 5 });

    expect((await getStatistics(MARCH_RANGE)).commissionWrittenOffSum).toBe(1000);
    expect((await getStatistics(APRIL_RANGE)).commissionWrittenOffSum).toBe(1000);
  });

  it("should show zero written off when nothing was paid in the period", async () => {
    const student = await createStudent(3000);
    await createLesson({ studentId: student.id, month: 3, day: 5 });

    const statistics = await getStatistics(MARCH_RANGE);

    expect(statistics.hasCommissionStudents).toBe(true);
    expect(statistics.commissionWrittenOffSum).toBe(0);
  });

  it("should attribute the write-off to the payment month while earnings stay in the lesson month", async () => {
    const student = await createStudent(3000);
    await createLesson({
      studentId: student.id,
      month: 2,
      day: 20,
      paymentMonth: 3,
      paymentDay: 5,
    });

    const march = await getStatistics(MARCH_RANGE);
    const april = await getStatistics(APRIL_RANGE);

    expect(march.earnings).toBe(1000);
    expect(march.commissionWrittenOffSum).toBe(0);
    expect(april.earnings).toBe(0);
    expect(april.commissionWrittenOffSum).toBe(1000);
  });

  it("should fall back to the lesson date when a paid lesson has no payment date", async () => {
    const student = await createStudent(3000);
    const lesson = await createLesson({ studentId: student.id, month: 2, day: 20 });
    await prisma.lesson.update({ where: { id: lesson.id }, data: { paymentDate: null } });

    const march = await getStatistics(MARCH_RANGE);
    const april = await getStatistics(APRIL_RANGE);

    expect(march.commissionWrittenOffSum).toBe(1000);
    expect(april.commissionWrittenOffSum).toBe(0);
  });

  it("should ignore forecast credits in every money figure", async () => {
    const student = await createStudent(3000);
    await createLesson({ studentId: student.id, month: 2, day: 5, isPaid: false });

    const statistics = await getStatistics(MARCH_RANGE);

    expect(statistics.commissionWrittenOffSum).toBe(0);
    expect(statistics.commissionRemainingTotal).toBe(3000);
  });

  it("should leave earnings, payments and tax untouched by commissions", async () => {
    const student = await createStudent(0);
    await prisma.user.update({ where: { id: userId }, data: { taxEnabled: true } });
    const period = await prisma.taxRatePeriod.create({
      data: { userId, startDate: new Date(Date.UTC(2026, 0, 1)), rate: 6 },
    });

    // The tax settings live on the shared user, so they are restored even if an
    // assertion below fails — otherwise the rest of the suite inherits them.
    try {
      await createLesson({ studentId: student.id, month: 2, day: 5 });
      await createLesson({ studentId: student.id, month: 2, day: 6 });

      const before = await getStatistics(MARCH_RANGE);

      await prisma.student.update({
        where: { id: student.id },
        data: { commissionAmount: 1500 },
      });

      const after = await getStatistics(MARCH_RANGE);

      expect(after.earnings).toBe(before.earnings);
      expect(after.paymentsInRangeSum).toBe(before.paymentsInRangeSum);
      expect(after.prepaidIncome).toBe(before.prepaidIncome);
      expect(after.taxAmount).toBe(before.taxAmount);
      expect(after.taxBreakdown).toEqual(before.taxBreakdown);
      expect(after.commissionWrittenOffSum).toBe(1500);
    } finally {
      await prisma.taxRatePeriod.delete({ where: { id: period.id } });
      await prisma.user.update({ where: { id: userId }, data: { taxEnabled: false } });
    }
  });

  it("should sum the remaining commission over non-archived students only", async () => {
    const active = await createStudent(3000);
    const archived = await createStudent(2000, true);
    await createLesson({ studentId: active.id, month: 2, day: 5, price: 1200 });
    await createLesson({ studentId: archived.id, month: 2, day: 6, price: 500 });

    const statistics = await getStatistics(MARCH_RANGE);

    expect(statistics.commissionRemainingTotal).toBe(1800);
    expect(statistics.commissionWrittenOffSum).toBe(1700);
  });

  it("should keep the remaining total unchanged when the period changes", async () => {
    const student = await createStudent(3000);
    await createLesson({ studentId: student.id, month: 2, day: 5, price: 1200 });

    const march = await getStatistics(MARCH_RANGE);
    const april = await getStatistics(APRIL_RANGE);

    expect(march.commissionRemainingTotal).toBe(1800);
    expect(april.commissionRemainingTotal).toBe(1800);
  });

  it("should report a zero remaining total when every commission is repaid", async () => {
    const student = await createStudent(1000);
    await createLesson({ studentId: student.id, month: 2, day: 5 });

    const statistics = await getStatistics(MARCH_RANGE);

    expect(statistics.hasCommissionStudents).toBe(true);
    expect(statistics.commissionRemainingTotal).toBe(0);
  });

  it("should still report commissions when the only such student is archived", async () => {
    const archived = await createStudent(2000, true);
    await createLesson({ studentId: archived.id, month: 2, day: 5 });

    const statistics = await getStatistics(MARCH_RANGE);

    expect(statistics.hasCommissionStudents).toBe(true);
    expect(statistics.commissionWrittenOffSum).toBe(1000);
    expect(statistics.commissionRemainingTotal).toBe(0);
  });
});
