import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../../index";
import { prisma } from "../../../lib/prisma";
import { generateToken } from "../../../utils/auth";

const HOUR_MS = 60 * 60 * 1000;
const SEPTEMBER = {
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2026-09-30T23:59:59.999Z",
};
const AUGUST = {
  startDate: "2026-08-01T00:00:00.000Z",
  endDate: "2026-08-31T23:59:59.999Z",
};

type Query = Record<string, string>;

describe("GET /api/statistics/income-history", () => {
  let userId: string;
  let authToken: string;
  let annaId: string;
  let borisId: string;

  const createTutor = async () => {
    const user = await prisma.user.create({
      data: { email: `income-${randomUUID()}@test.local`, password: "x", name: "Учитель" },
    });
    return { id: user.id, token: generateToken({ userId: user.id, email: user.email }) };
  };

  const createStudent = (tutorId: string, name: string) =>
    prisma.student.create({ data: { name, contactMethod: "WHATSAPP", tutorId } });

  const createPaidLesson = (data: {
    startTime: string;
    paymentDate?: string | null;
    price?: number | null;
    receivedAmount?: number;
    studentId?: string | null;
    prospectName?: string;
    status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
    tutorId?: string;
    isPaid?: boolean;
    isTaxExempt?: boolean;
  }) => {
    const startTime = new Date(data.startTime);
    const price = data.price === undefined ? 1500 : data.price;
    const isPaid = data.isPaid ?? true;
    return prisma.lesson.create({
      data: {
        tutorId: data.tutorId ?? userId,
        studentId: data.studentId === undefined ? annaId : data.studentId,
        prospectName: data.prospectName,
        subject: "MATHEMATICS",
        lessonType: "SCHOOL",
        startTime,
        endTime: new Date(startTime.getTime() + HOUR_MS),
        status: data.status ?? "COMPLETED",
        price,
        isPaid,
        paymentDate:
          data.paymentDate === undefined
            ? startTime
            : data.paymentDate && new Date(data.paymentDate),
        receivedAmount: isPaid ? (data.receivedAmount ?? price ?? 0) : null,
        isTaxExempt: data.isTaxExempt ?? false,
      },
    });
  };

  const setTaxPeriods = async (periods: Array<{ startDate: string; rate: number }>) => {
    await prisma.user.update({ where: { id: userId }, data: { taxEnabled: true } });
    await prisma.taxRatePeriod.createMany({
      data: periods.map((period) => ({
        userId,
        startDate: new Date(period.startDate),
        rate: period.rate,
      })),
    });
  };

  const setCommission = (studentId: string, commissionAmount: number) =>
    prisma.student.update({ where: { id: studentId }, data: { commissionAmount } });

  type HistoryEntry = {
    lessonId: string;
    receivedAmount: number;
    tax: { kind: string; amount?: number; rate?: number } | null;
    commissionCredit: number | null;
  };
  type HistoryDay = {
    date: string;
    total: number;
    taxTotal: number | null;
    entries: HistoryEntry[];
  };

  const getAllDays = async (query: Query) => {
    const days: HistoryDay[] = [];
    let before: string | null = null;
    do {
      const res: request.Response = await getHistory(before ? { ...query, before } : query).expect(
        200
      );
      days.push(...res.body.days);
      before = res.body.page.nextCursor;
    } while (before);
    return days;
  };

  const entriesOf = (days: HistoryDay[]) => days.flatMap((day) => day.entries);

  const entryOf = (days: HistoryDay[], lessonId: string) =>
    entriesOf(days).find((entry) => entry.lessonId === lessonId);

  const sumTaxes = (entries: HistoryEntry[]) =>
    entries.reduce(
      (sum, entry) => sum + (entry.tax?.kind === "TAXED" ? (entry.tax.amount ?? 0) : 0),
      0
    );

  const getHistory = (query: Query, timezone?: string) => {
    const req = request(app)
      .get("/api/statistics/income-history")
      .set("Authorization", `Bearer ${authToken}`)
      .query(query);
    return timezone ? req.set("X-Timezone", timezone) : req;
  };

  const getStatistics = async (query: Query) => {
    const res = await request(app)
      .get("/api/statistics")
      .set("Authorization", `Bearer ${authToken}`)
      .query(query)
      .expect(200);
    return res.body;
  };

  beforeEach(async () => {
    const tutor = await createTutor();
    userId = tutor.id;
    authToken = tutor.token;
    annaId = (await createStudent(userId, "Анна")).id;
    borisId = (await createStudent(userId, "Борис")).id;
  });

  afterEach(async () => {
    await prisma.lesson.deleteMany({ where: { tutorId: userId } });
    await prisma.student.deleteMany({ where: { tutorId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should list payments by day from newest to oldest with day totals and a period total", async () => {
    await createPaidLesson({ startTime: "2026-09-03T10:00:00Z", studentId: annaId });
    await createPaidLesson({ startTime: "2026-09-05T12:00:00Z", studentId: borisId, price: 2000 });
    await createPaidLesson({ startTime: "2026-09-03T08:00:00Z", studentId: annaId });

    const res = await getHistory(SEPTEMBER).expect(200);

    expect(res.body.summary).toEqual({
      total: 5000,
      count: 3,
      taxTotal: null,
      taxExemptTotal: null,
      commissionTotal: null,
    });
    expect(res.body.days.map((day: { date: string }) => day.date)).toEqual([
      "2026-09-05",
      "2026-09-03",
    ]);
    expect(res.body.days[0].total).toBe(2000);
    expect(res.body.days[1].total).toBe(3000);
    expect(
      res.body.days[1].entries.map((entry: { lessonStartTime: string }) => entry.lessonStartTime)
    ).toEqual(["2026-09-03T08:00:00.000Z", "2026-09-03T10:00:00.000Z"]);
    expect(res.body.days[0].entries[0]).toMatchObject({
      student: { name: "Борис", archived: false },
      prospectName: null,
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      lessonStatus: "COMPLETED",
      price: 2000,
      receivedAmount: 2000,
      hasPaymentDate: true,
      tax: null,
      commissionCredit: null,
    });
    expect(res.body.page).toEqual({ nextCursor: null, remainingCount: 0 });
  });

  it("should match the payments card of GET /api/statistics for the same period", async () => {
    await createPaidLesson({ startTime: "2026-09-03T10:00:00Z" });
    await createPaidLesson({ startTime: "2026-09-04T10:00:00Z", paymentDate: null, price: 999.5 });
    await createPaidLesson({
      startTime: "2026-08-20T10:00:00Z",
      paymentDate: "2026-09-02T00:00:00Z",
    });
    await createPaidLesson({ startTime: "2026-09-10T10:00:00Z", isPaid: false });

    const history = (await getHistory(SEPTEMBER).expect(200)).body;
    const statistics = await getStatistics(SEPTEMBER);

    expect(history.summary.total).toBe(statistics.paymentsInRangeSum);
    expect(history.summary.count).toBe(statistics.paymentsInRangeCount);
    expect(history.summary.count).toBe(3);
  });

  it("should show payments of another period when the period changes", async () => {
    await createPaidLesson({ startTime: "2026-09-03T10:00:00Z" });
    await createPaidLesson({ startTime: "2026-08-14T10:00:00Z", price: 1700 });

    const res = await getHistory(AUGUST).expect(200);

    expect(res.body.days.map((day: { date: string }) => day.date)).toEqual(["2026-08-14"]);
    expect(res.body.summary.total).toBe(1700);
  });

  it("should put a payment without a payment date on the lesson day", async () => {
    await createPaidLesson({ startTime: "2026-09-07T10:00:00Z", paymentDate: null });

    const res = await getHistory(SEPTEMBER).expect(200);

    expect(res.body.days[0].date).toBe("2026-09-07");
    expect(res.body.days[0].entries[0].hasPaymentDate).toBe(false);
  });

  it("should keep a cancelled paid lesson without a payment date", async () => {
    await createPaidLesson({
      startTime: "2026-09-07T10:00:00Z",
      paymentDate: null,
      status: "CANCELLED",
    });

    const res = await getHistory(SEPTEMBER).expect(200);

    expect(res.body.days[0].entries[0].lessonStatus).toBe("CANCELLED");
  });

  it("should show a prepayment for a future lesson on the payment day", async () => {
    await createPaidLesson({
      startTime: "2026-10-20T10:00:00Z",
      paymentDate: "2026-09-15T00:00:00Z",
      status: "SCHEDULED",
    });

    const res = await getHistory(SEPTEMBER).expect(200);

    expect(res.body.days[0].date).toBe("2026-09-15");
    expect(res.body.days[0].entries[0]).toMatchObject({
      lessonStatus: "SCHEDULED",
      lessonStartTime: "2026-10-20T10:00:00.000Z",
    });
  });

  it("should show the contact name of a trial lesson without a student", async () => {
    await createPaidLesson({
      startTime: "2026-09-07T10:00:00Z",
      studentId: null,
      prospectName: "Пётр",
      price: 500,
    });

    const res = await getHistory(SEPTEMBER).expect(200);

    expect(res.body.days[0].entries[0]).toMatchObject({ student: null, prospectName: "Пётр" });
  });

  it("should show the current name and the archive flag of an archived student", async () => {
    await createPaidLesson({ startTime: "2026-09-07T10:00:00Z", studentId: annaId });
    await prisma.student.update({
      where: { id: annaId },
      data: { name: "Анна Смирнова", archived: true },
    });

    const res = await getHistory(SEPTEMBER).expect(200);

    expect(res.body.days[0].entries[0].student).toEqual({
      name: "Анна Смирнова",
      archived: true,
    });
  });

  it("should leave out a paid lesson with a zero received amount", async () => {
    await createPaidLesson({ startTime: "2026-09-07T10:00:00Z", receivedAmount: 0 });

    const res = await getHistory(SEPTEMBER).expect(200);

    expect(res.body.days).toEqual([]);
    expect(res.body.summary.count).toBe(0);
  });

  it("should use the X-Timezone day boundary and UTC without the header", async () => {
    await createPaidLesson({
      startTime: "2026-09-04T10:00:00Z",
      paymentDate: "2026-09-04T21:30:00Z",
    });

    const moscow = await getHistory(SEPTEMBER, "Europe/Moscow").expect(200);
    const utc = await getHistory(SEPTEMBER).expect(200);
    const invalid = await getHistory(SEPTEMBER, "Mars/Phobos").expect(200);

    expect(moscow.body.days[0].date).toBe("2026-09-05");
    expect(utc.body.days[0].date).toBe("2026-09-04");
    expect(invalid.body.days[0].date).toBe("2026-09-04");
  });

  it("should return an empty history for a period without payments", async () => {
    const res = await getHistory(SEPTEMBER).expect(200);

    expect(res.body).toEqual({
      summary: { total: 0, count: 0, taxTotal: null, taxExemptTotal: null, commissionTotal: null },
      days: [],
      page: { nextCursor: null, remainingCount: 0 },
    });
  });

  it("should page through 120 payments by whole days without repeats or gaps", async () => {
    await prisma.lesson.createMany({
      data: Array.from({ length: 120 }, (_, index) => {
        const day = 1 + Math.floor(index / 4);
        const startTime = new Date(Date.UTC(2026, 8, day, 8 + (index % 4), 0, 0));
        return {
          tutorId: userId,
          studentId: index % 2 === 0 ? annaId : borisId,
          subject: "MATHEMATICS" as const,
          lessonType: "SCHOOL" as const,
          startTime,
          endTime: new Date(startTime.getTime() + HOUR_MS),
          status: "COMPLETED" as const,
          price: 1000,
          isPaid: true,
          paymentDate: startTime,
          receivedAmount: 1000,
        };
      }),
    });

    const seen: string[] = [];
    const pageSizes: number[] = [];
    let before: string | null = null;
    let requests = 0;
    do {
      const query: Query = before ? { ...SEPTEMBER, before } : SEPTEMBER;
      const res = await getHistory(query).expect(200);
      requests += 1;
      const days = res.body.days as Array<{ date: string; entries: Array<{ lessonId: string }> }>;
      const size = days.reduce((count, day) => count + day.entries.length, 0);

      expect(size).toBeLessThanOrEqual(50);
      expect(days.every((day) => day.entries.length === 4)).toBe(true);
      expect(res.body.summary).toMatchObject({ total: 120000, count: 120 });
      expect(res.body.page.remainingCount).toBe(120 - seen.length - size);

      pageSizes.push(size);
      seen.push(...days.flatMap((day) => day.entries.map((entry) => entry.lessonId)));
      before = res.body.page.nextCursor;
    } while (before && requests < 10);

    expect(pageSizes).toEqual([48, 48, 24]);
    expect(seen).toHaveLength(120);
    expect(new Set(seen).size).toBe(120);
  });

  it("should reload every day down to the through day", async () => {
    for (const day of [1, 2, 3, 4]) {
      await createPaidLesson({ startTime: `2026-09-0${day}T10:00:00Z` });
    }

    const res = await getHistory({ ...SEPTEMBER, through: "2026-09-02" }).expect(200);

    expect(res.body.days.map((day: { date: string }) => day.date)).toEqual([
      "2026-09-04",
      "2026-09-03",
      "2026-09-02",
    ]);
    expect(res.body.page).toEqual({ nextCursor: "2026-09-02", remainingCount: 1 });
    expect(res.body.summary.count).toBe(4);
  });

  it.each([
    [{ before: "2026-09-02", through: "2026-09-02" }, "Некорректная позиция продолжения истории"],
    [{ before: "abc" }, "Некорректная позиция продолжения истории"],
    [{ through: "2026-9-2" }, "Некорректная позиция продолжения истории"],
    [{ startDate: "garbage" }, "Некорректный период"],
    [{ endDate: "garbage" }, "Некорректный период"],
  ])("should reject the query %o with 400", async (query, error) => {
    const res = await getHistory({ ...SEPTEMBER, ...query }).expect(400);

    expect(res.body).toEqual({ error });
  });

  describe("tax and commission", () => {
    it("should show tax and commission per payment that match the cards", async () => {
      await setTaxPeriods([{ startDate: "2026-01-01T00:00:00Z", rate: 6 }]);
      await setCommission(borisId, 3000);
      const plain = await createPaidLesson({ startTime: "2026-09-03T10:00:00Z", price: 1000 });
      const exempt = await createPaidLesson({
        startTime: "2026-09-04T10:00:00Z",
        price: 2000,
        isTaxExempt: true,
      });
      const credited = await createPaidLesson({
        startTime: "2026-09-05T10:00:00Z",
        studentId: borisId,
        price: 1500,
      });

      const history = (await getHistory(SEPTEMBER).expect(200)).body;
      const statistics = await getStatistics(SEPTEMBER);

      expect(entryOf(history.days, plain.id)).toMatchObject({
        receivedAmount: 1000,
        tax: { kind: "TAXED", amount: 60, rate: 6 },
        commissionCredit: null,
      });
      expect(entryOf(history.days, exempt.id)).toMatchObject({
        receivedAmount: 2000,
        tax: { kind: "EXEMPT" },
        commissionCredit: null,
      });
      expect(entryOf(history.days, credited.id)).toMatchObject({
        receivedAmount: 1500,
        tax: { kind: "TAXED", amount: 90, rate: 6 },
        commissionCredit: 1500,
      });
      expect(history.summary).toEqual({
        total: 4500,
        count: 3,
        taxTotal: 150,
        taxExemptTotal: 2000,
        commissionTotal: 1500,
      });
      expect(history.summary.taxTotal).toBe(statistics.taxAmount);
      expect(history.summary.taxExemptTotal).toBe(statistics.taxExemptIncome);
      expect(history.summary.commissionTotal).toBe(statistics.commissionWrittenOffSum);

      await request(app)
        .put(`/api/lessons/${plain.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ price: 1200 })
        .expect(200);

      const afterPriceChange = (await getHistory(SEPTEMBER).expect(200)).body;
      expect(entryOf(afterPriceChange.days, plain.id)).toMatchObject({
        receivedAmount: 1000,
        tax: { kind: "TAXED", amount: 60, rate: 6 },
      });
      expect(afterPriceChange.summary.taxTotal).toBe(150);
    });

    it("should reconcile with the cards on rate changes, zero rates, underpayments and price edits", async () => {
      await setTaxPeriods([
        { startDate: "2026-09-10T00:00:00Z", rate: 6 },
        { startDate: "2026-09-20T00:00:00Z", rate: 4 },
        { startDate: "2026-09-28T00:00:00Z", rate: 0 },
      ]);
      await setCommission(borisId, 3000);
      const beforePeriods = await createPaidLesson({ startTime: "2026-09-05T10:00:00Z" });
      const firstRate = await createPaidLesson({
        startTime: "2026-09-12T10:00:00Z",
        studentId: borisId,
        price: 1000,
      });
      const underpaid = await createPaidLesson({
        startTime: "2026-09-13T10:00:00Z",
        price: 2000,
        receivedAmount: 1833.33,
      });
      const repriced = await createPaidLesson({
        startTime: "2026-09-14T10:00:00Z",
        price: 1700,
        receivedAmount: 1500,
      });
      const secondRate = await createPaidLesson({
        startTime: "2026-09-25T10:00:00Z",
        studentId: borisId,
        price: 2500,
      });
      await createPaidLesson({
        startTime: "2026-09-26T10:00:00Z",
        price: 777.77,
        isTaxExempt: true,
      });
      const zeroRate = await createPaidLesson({ startTime: "2026-09-29T10:00:00Z", price: 1100 });
      await createPaidLesson({
        startTime: "2026-09-25T12:00:00Z",
        studentId: borisId,
        price: 900,
        paymentDate: "2026-08-25T00:00:00Z",
      });

      const days = await getAllDays(SEPTEMBER);
      const history = (await getHistory(SEPTEMBER).expect(200)).body;
      const statistics = await getStatistics(SEPTEMBER);

      expect(entryOf(days, beforePeriods.id)?.tax).toEqual({ kind: "OUTSIDE_PERIODS" });
      expect(entryOf(days, firstRate.id)?.tax).toEqual({ kind: "TAXED", amount: 60, rate: 6 });
      expect(entryOf(days, underpaid.id)?.tax).toEqual({ kind: "TAXED", amount: 110, rate: 6 });
      expect(entryOf(days, repriced.id)?.tax).toEqual({ kind: "TAXED", amount: 90, rate: 6 });
      expect(entryOf(days, secondRate.id)?.tax).toEqual({ kind: "TAXED", amount: 100, rate: 4 });
      expect(entryOf(days, zeroRate.id)?.tax).toEqual({ kind: "TAXED", amount: 0, rate: 0 });

      expect(history.summary.total).toBe(statistics.paymentsInRangeSum);
      expect(history.summary.taxTotal).toBe(statistics.taxAmount);
      expect(sumTaxes(entriesOf(days))).toBe(statistics.taxAmount);
      expect(history.summary.taxExemptTotal).toBe(statistics.taxExemptIncome);
      expect(history.summary.commissionTotal).toBe(statistics.commissionWrittenOffSum);
      for (const day of days) {
        expect(day.taxTotal).toBe(sumTaxes(day.entries));
      }
    });

    it("should leave out every tax field when tax accounting is off", async () => {
      await prisma.taxRatePeriod.create({
        data: { userId, startDate: new Date("2026-01-01T00:00:00Z"), rate: 6 },
      });
      await createPaidLesson({ startTime: "2026-09-03T10:00:00Z" });
      await createPaidLesson({ startTime: "2026-09-04T10:00:00Z", isTaxExempt: true });

      const history = (await getHistory(SEPTEMBER).expect(200)).body;

      expect(history.summary.taxTotal).toBeNull();
      expect(history.summary.taxExemptTotal).toBeNull();
      for (const day of history.days) {
        expect(day.taxTotal).toBeNull();
        for (const entry of day.entries) {
          expect(entry.tax).toBeNull();
        }
      }
    });

    it("should leave out every commission field when no student has a commission", async () => {
      await createPaidLesson({ startTime: "2026-09-03T10:00:00Z", studentId: borisId });

      const history = (await getHistory(SEPTEMBER).expect(200)).body;

      expect(history.summary.commissionTotal).toBeNull();
      expect(entriesOf(history.days).every((entry) => entry.commissionCredit === null)).toBe(true);
    });

    it("should not credit a prepaid future lesson in the history", async () => {
      await setCommission(borisId, 3000);
      const prepaid = await createPaidLesson({
        startTime: "2026-10-20T10:00:00Z",
        paymentDate: "2026-09-15T00:00:00Z",
        studentId: borisId,
        status: "SCHEDULED",
      });

      const history = (await getHistory(SEPTEMBER).expect(200)).body;
      const statistics = await getStatistics(SEPTEMBER);

      expect(entryOf(history.days, prepaid.id)?.commissionCredit).toBeNull();
      expect(history.summary.commissionTotal).toBe(0);
      expect(history.summary.commissionTotal).toBe(statistics.commissionWrittenOffSum);
    });
  });

  describe("after editing a lesson", () => {
    const sendLessonRequest = (method: "put" | "delete" | "get", lessonId: string) =>
      request(app)[method](`/api/lessons/${lessonId}`).set("Authorization", `Bearer ${authToken}`);

    it("should drop a payment moved out of the period from the same depth", async () => {
      const lessons = [];
      for (const day of [1, 2, 3, 4]) {
        lessons.push(await createPaidLesson({ startTime: `2026-09-0${day}T10:00:00Z` }));
      }
      const [first, , , fourth] = lessons;

      for (const lesson of [first, fourth]) {
        await sendLessonRequest("put", lesson.id)
          .send({ paymentDate: "2026-08-15T00:00:00.000Z" })
          .expect(200);
      }
      const res = await getHistory({ ...SEPTEMBER, through: "2026-09-03" }).expect(200);

      expect(res.body.days.map((day: HistoryDay) => day.date)).toEqual(["2026-09-03"]);
      expect(res.body.summary).toMatchObject({ total: 3000, count: 2 });
      expect(res.body.page).toEqual({ nextCursor: "2026-09-03", remainingCount: 1 });
    });

    it("should drop a deleted lesson and answer 404 when it is opened", async () => {
      const kept = await createPaidLesson({ startTime: "2026-09-03T10:00:00Z" });
      const deleted = await createPaidLesson({ startTime: "2026-09-04T10:00:00Z", price: 2000 });

      await sendLessonRequest("delete", deleted.id).expect(200);
      const res = await getHistory({ ...SEPTEMBER, through: "2026-09-03" }).expect(200);
      const lessonRes = await sendLessonRequest("get", deleted.id).expect(404);

      expect(entriesOf(res.body.days).map((entry) => entry.lessonId)).toEqual([kept.id]);
      expect(res.body.summary).toMatchObject({ total: 1500, count: 1 });
      expect(lessonRes.body).toEqual({ error: "Урок не найден" });
    });
  });

  it("should require a token", async () => {
    await request(app).get("/api/statistics/income-history").expect(401);
  });

  it("should not show lessons of another tutor", async () => {
    const other = await createTutor();
    const otherStudent = await createStudent(other.id, "Чужой");
    try {
      await createPaidLesson({
        startTime: "2026-09-07T10:00:00Z",
        tutorId: other.id,
        studentId: otherStudent.id,
      });

      const res = await getHistory(SEPTEMBER).expect(200);

      expect(res.body.days).toEqual([]);
    } finally {
      await prisma.lesson.deleteMany({ where: { tutorId: other.id } });
      await prisma.student.deleteMany({ where: { tutorId: other.id } });
      await prisma.user.delete({ where: { id: other.id } });
    }
  });
});
