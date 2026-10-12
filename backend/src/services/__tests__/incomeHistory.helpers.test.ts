import { Prisma } from "@prisma/client";
import type { LessonStatus } from "@prisma/client";
import type { IncomeHistoryDayDto } from "../../types";
import type { CommissionCredit } from "../../types";
import type { StudentCommissionAllocation } from "../commission";
import {
  INCOME_HISTORY_PAGE_SIZE,
  buildIncomeHistoryContext,
  buildSummary,
  compareEntriesWithinDay,
  groupIntoDays,
  slicePage,
  sumMoney,
  toEntry,
} from "../incomeHistory";
import type { IncomeHistoryContext, IncomeHistoryLessonRow } from "../incomeHistory";

const HOUR_MS = 60 * 60 * 1000;

const PLAIN: IncomeHistoryContext = { taxPeriods: null, commissionCredits: null };

type RowInput = {
  id?: string;
  student?: { id: string; name: string; archived?: boolean } | null;
  prospectName?: string | null;
  startTime?: string;
  paymentDate?: string | null;
  price?: number | null;
  receivedAmount?: number;
  status?: LessonStatus;
  isTaxExempt?: boolean;
};

let sequence = 0;

const makeRow = (input: RowInput = {}): IncomeHistoryLessonRow => {
  sequence += 1;
  const startTime = new Date(input.startTime ?? "2026-10-03T10:00:00Z");
  const price = input.price === undefined ? 1500 : input.price;

  return {
    id: input.id ?? `lesson-${String(sequence).padStart(5, "0")}`,
    subject: "MATHEMATICS",
    lessonType: "SCHOOL",
    startTime,
    endTime: new Date(startTime.getTime() + HOUR_MS),
    status: input.status ?? "COMPLETED",
    price: price === null ? null : new Prisma.Decimal(price),
    receivedAmount: new Prisma.Decimal(input.receivedAmount ?? price ?? 0),
    paymentDate:
      input.paymentDate === null ? null : new Date(input.paymentDate ?? "2026-10-03T00:00:00Z"),
    isTaxExempt: input.isTaxExempt ?? false,
    prospectName: input.prospectName ?? null,
    student:
      input.student === undefined
        ? { id: "student-anna", name: "Анна", archived: false }
        : input.student && { archived: false, ...input.student },
  };
};

const makeDay = (date: string, size: number): IncomeHistoryDayDto => {
  const entries = Array.from({ length: size }, () =>
    toEntry(makeRow({ paymentDate: `${date}T00:00:00Z` }), PLAIN)
  );
  return { date, total: sumMoney(entries.map((e) => e.receivedAmount)), taxTotal: null, entries };
};

const datesOf = (days: IncomeHistoryDayDto[]) => days.map((day) => day.date);

describe("sumMoney", () => {
  it("should add amounts in whole kopecks", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([1000.1, 999.95])).toBe(2000.05);
    expect(sumMoney([])).toBe(0);
  });
});

describe("toEntry", () => {
  it("should map a lesson row to a history entry", () => {
    const row = makeRow({
      id: "lesson-x",
      student: { id: "s1", name: "Анна", archived: true },
      startTime: "2026-10-13T16:00:00Z",
      paymentDate: "2026-10-11T00:00:00Z",
      price: 2500,
      receivedAmount: 2000,
      status: "SCHEDULED",
    });

    expect(toEntry(row, PLAIN)).toEqual({
      lessonId: "lesson-x",
      student: { name: "Анна", archived: true },
      prospectName: null,
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      lessonStartTime: "2026-10-13T16:00:00.000Z",
      lessonEndTime: "2026-10-13T17:00:00.000Z",
      lessonStatus: "SCHEDULED",
      price: 2500,
      receivedAmount: 2000,
      hasPaymentDate: true,
      tax: null,
      commissionCredit: null,
    });
  });

  it("should describe a trial lesson without a student and without a payment date", () => {
    const entry = toEntry(
      makeRow({ student: null, prospectName: "Пётр", paymentDate: null, price: null }),
      PLAIN
    );

    expect(entry.student).toBeNull();
    expect(entry.prospectName).toBe("Пётр");
    expect(entry.hasPaymentDate).toBe(false);
    expect(entry.price).toBe(0);
  });
});

describe("compareEntriesWithinDay", () => {
  it("should order by group name ignoring case", () => {
    const boris = makeRow({ student: { id: "s-b", name: "Борис" } });
    const anna = makeRow({ student: { id: "s-a", name: "анна" } });
    expect(compareEntriesWithinDay(anna, boris)).toBeLessThan(0);
    expect(compareEntriesWithinDay(boris, anna)).toBeGreaterThan(0);
  });

  it("should break ties by lesson id", () => {
    const first = makeRow({ id: "a" });
    const second = makeRow({ id: "b" });
    expect(compareEntriesWithinDay(first, second)).toBeLessThan(0);
    expect(compareEntriesWithinDay(first, first)).toBe(0);
  });
});

describe("groupIntoDays", () => {
  it("should group by payment date and fall back to the lesson start", () => {
    const days = groupIntoDays(
      [
        makeRow({ paymentDate: "2026-10-03T00:00:00Z" }),
        makeRow({ paymentDate: null, startTime: "2026-10-05T10:00:00Z" }),
      ],
      "UTC",
      PLAIN
    );

    expect(datesOf(days)).toEqual(["2026-10-05", "2026-10-03"]);
    expect(days[0].entries[0].hasPaymentDate).toBe(false);
  });

  it("should use the timezone for the day boundary", () => {
    const rows = [makeRow({ paymentDate: "2026-10-04T21:30:00Z" })];
    expect(datesOf(groupIntoDays(rows, "Europe/Moscow", PLAIN))).toEqual(["2026-10-05"]);
    expect(datesOf(groupIntoDays(rows, "UTC", PLAIN))).toEqual(["2026-10-04"]);
  });

  it("should list days from newest to oldest", () => {
    const days = groupIntoDays(
      ["2026-09-30", "2026-10-11", "2026-10-02"].map((date) =>
        makeRow({ paymentDate: `${date}T00:00:00Z` })
      ),
      "UTC",
      PLAIN
    );
    expect(datesOf(days)).toEqual(["2026-10-11", "2026-10-02", "2026-09-30"]);
  });

  it("should keep each student's lessons together, ordered by name, lesson time and id", () => {
    const vera = makeRow({ id: "v1", student: { id: "s-v", name: "Вера" } });
    const annaLate = makeRow({
      id: "a2",
      student: { id: "s-a", name: "Анна" },
      startTime: "2026-10-15T10:00:00Z",
    });
    const boris = makeRow({ id: "b1", student: { id: "s-b", name: "борис" } });
    const annaEarly = makeRow({
      id: "a1",
      student: { id: "s-a", name: "Анна" },
      startTime: "2026-10-13T10:00:00Z",
    });
    const annaSameTime = makeRow({
      id: "a0",
      student: { id: "s-a", name: "Анна" },
      startTime: "2026-10-15T10:00:00Z",
    });

    const [day] = groupIntoDays([vera, annaLate, boris, annaEarly, annaSameTime], "UTC", PLAIN);

    expect(day.entries.map((entry) => entry.lessonId)).toEqual(["a1", "a0", "a2", "b1", "v1"]);
  });

  it("should keep namesakes and trial lessons in separate groups", () => {
    const annaB1 = makeRow({
      id: "x1",
      student: { id: "s-b", name: "Анна" },
      startTime: "2026-10-01T10:00:00Z",
    });
    const annaA = makeRow({
      id: "x2",
      student: { id: "s-a", name: "Анна" },
      startTime: "2026-10-02T10:00:00Z",
    });
    const annaB2 = makeRow({
      id: "x3",
      student: { id: "s-b", name: "Анна" },
      startTime: "2026-10-03T10:00:00Z",
    });
    const trialAnna = makeRow({
      id: "x4",
      student: null,
      prospectName: "Анна",
      startTime: "2026-10-01T09:00:00Z",
    });

    const [day] = groupIntoDays([annaB1, annaA, annaB2, trialAnna], "UTC", PLAIN);

    expect(day.entries.map((entry) => entry.lessonId)).toEqual(["x4", "x2", "x1", "x3"]);
  });

  it("should sum each day in kopecks", () => {
    const [day] = groupIntoDays(
      [makeRow({ receivedAmount: 0.1 }), makeRow({ receivedAmount: 0.2 })],
      "UTC",
      PLAIN
    );
    expect(day.total).toBe(0.3);
    expect(day.taxTotal).toBeNull();
  });
});

describe("buildSummary", () => {
  it("should total every day of the period", () => {
    const days = groupIntoDays(
      [
        makeRow({ paymentDate: "2026-10-03T00:00:00Z", receivedAmount: 1500.1 }),
        makeRow({ paymentDate: "2026-10-03T00:00:00Z", receivedAmount: 1500.2 }),
        makeRow({ paymentDate: "2026-10-05T00:00:00Z", receivedAmount: 2000 }),
      ],
      "UTC",
      PLAIN
    );

    expect(buildSummary(days, PLAIN)).toEqual({
      total: 5000.3,
      count: 3,
      taxTotal: null,
      taxExemptTotal: null,
      commissionTotal: null,
    });
  });

  it("should return zeros for an empty period", () => {
    expect(buildSummary([], PLAIN)).toEqual({
      total: 0,
      count: 0,
      taxTotal: null,
      taxExemptTotal: null,
      commissionTotal: null,
    });
  });
});

describe("slicePage", () => {
  it("should use pages of 50 payments", () => {
    expect(INCOME_HISTORY_PAGE_SIZE).toBe(50);
  });

  it("should return everything in one response when fewer than 50 payments", () => {
    const days = [makeDay("2026-10-05", 10), makeDay("2026-10-03", 20)];
    const slice = slicePage(days, {});

    expect(datesOf(slice.days)).toEqual(["2026-10-05", "2026-10-03"]);
    expect(slice.page).toEqual({ nextCursor: null, remainingCount: 0 });
  });

  it("should not split a day that does not fit into the page", () => {
    const days = [makeDay("2026-10-05", 30), makeDay("2026-10-03", 30)];
    const slice = slicePage(days, {});

    expect(datesOf(slice.days)).toEqual(["2026-10-05"]);
    expect(slice.page).toEqual({ nextCursor: "2026-10-05", remainingCount: 30 });
  });

  it("should return a day with more than 50 payments whole", () => {
    const slice = slicePage([makeDay("2026-10-05", 70)], {});

    expect(slice.days[0].entries).toHaveLength(70);
    expect(slice.page).toEqual({ nextCursor: null, remainingCount: 0 });
  });

  it("should fit exactly 50 payments into one page", () => {
    const days = [makeDay("2026-10-05", 25), makeDay("2026-10-03", 25), makeDay("2026-10-01", 1)];
    const slice = slicePage(days, {});

    expect(datesOf(slice.days)).toEqual(["2026-10-05", "2026-10-03"]);
    expect(slice.page).toEqual({ nextCursor: "2026-10-03", remainingCount: 1 });
  });

  it("should continue strictly after the before day", () => {
    const days = [makeDay("2026-10-05", 30), makeDay("2026-10-03", 30), makeDay("2026-10-01", 30)];
    const slice = slicePage(days, { before: "2026-10-05" });

    expect(datesOf(slice.days)).toEqual(["2026-10-03"]);
    expect(slice.page).toEqual({ nextCursor: "2026-10-03", remainingCount: 30 });

    const last = slicePage(days, { before: "2026-10-03" });
    expect(datesOf(last.days)).toEqual(["2026-10-01"]);
    expect(last.page).toEqual({ nextCursor: null, remainingCount: 0 });
  });

  it("should return nothing after the oldest day", () => {
    const slice = slicePage([makeDay("2026-10-05", 3)], { before: "2026-10-05" });

    expect(slice.days).toEqual([]);
    expect(slice.page).toEqual({ nextCursor: null, remainingCount: 0 });
  });

  it("should reload every day down to the through day without the page limit", () => {
    const days = [makeDay("2026-10-05", 30), makeDay("2026-10-03", 30), makeDay("2026-10-01", 30)];

    const all = slicePage(days, { through: "2026-10-01" });
    expect(datesOf(all.days)).toEqual(["2026-10-05", "2026-10-03", "2026-10-01"]);
    expect(all.page).toEqual({ nextCursor: null, remainingCount: 0 });

    const two = slicePage(days, { through: "2026-10-03" });
    expect(datesOf(two.days)).toEqual(["2026-10-05", "2026-10-03"]);
    expect(two.page).toEqual({ nextCursor: "2026-10-03", remainingCount: 30 });
  });

  it("should continue from the through day when that day no longer has payments", () => {
    const days = [makeDay("2026-10-05", 2), makeDay("2026-10-01", 4)];
    const slice = slicePage(days, { through: "2026-10-03" });

    expect(datesOf(slice.days)).toEqual(["2026-10-05"]);
    expect(slice.page).toEqual({ nextCursor: "2026-10-05", remainingCount: 4 });

    const empty = slicePage([makeDay("2026-10-01", 4)], { through: "2026-10-03" });
    expect(empty.days).toEqual([]);
    expect(empty.page).toEqual({ nextCursor: "2026-10-03", remainingCount: 4 });
  });

  it("should keep references to the day objects", () => {
    const days = [makeDay("2026-10-05", 1)];
    expect(slicePage(days, {}).days[0]).toBe(days[0]);
  });
});

describe("tax and commission of history rows", () => {
  const taxContext = (startDate = "2026-01-01T00:00:00.000Z", rate = 6): IncomeHistoryContext => ({
    taxPeriods: [{ id: "p1", startDate, rate }],
    commissionCredits: null,
  });

  it("should tax a payment by its received amount at the rate on the payment date", () => {
    const entry = toEntry(makeRow({ price: 2500, receivedAmount: 2000 }), taxContext());

    expect(entry.tax).toEqual({ kind: "TAXED", amount: 120, rate: 6 });
    expect(entry.receivedAmount).toBe(2000);
  });

  it("should mark a payment before the first period as outside periods", () => {
    const entry = toEntry(makeRow(), taxContext("2026-11-01T00:00:00.000Z"));

    expect(entry.tax).toEqual({ kind: "OUTSIDE_PERIODS" });
  });

  it("should mark every payment as outside periods when no period is configured", () => {
    const entry = toEntry(makeRow(), { taxPeriods: [], commissionCredits: null });

    expect(entry.tax).toEqual({ kind: "OUTSIDE_PERIODS" });
  });

  it("should keep a 0% rate as taxed, not outside periods", () => {
    const entry = toEntry(makeRow(), taxContext("2026-01-01T00:00:00.000Z", 0));

    expect(entry.tax).toEqual({ kind: "TAXED", amount: 0, rate: 0 });
  });

  it("should mark a tax-exempt payment as exempt", () => {
    expect(toEntry(makeRow({ isTaxExempt: true }), taxContext()).tax).toEqual({ kind: "EXEMPT" });
  });

  it("should take the lesson start as the tax date when there is no payment date", () => {
    const context = taxContext("2026-10-04T00:00:00.000Z");

    expect(toEntry(makeRow({ paymentDate: "2026-10-03T00:00:00Z" }), context).tax).toEqual({
      kind: "OUTSIDE_PERIODS",
    });
    expect(
      toEntry(makeRow({ paymentDate: null, startTime: "2026-10-05T10:00:00Z" }), context).tax
    ).toEqual({ kind: "TAXED", amount: 90, rate: 6 });
  });

  it("should leave tax out entirely when tax accounting is off", () => {
    const [day] = groupIntoDays([makeRow({ isTaxExempt: true })], "UTC", PLAIN);

    expect(day.entries[0].tax).toBeNull();
    expect(day.taxTotal).toBeNull();
    expect(buildSummary([day], PLAIN).taxExemptTotal).toBeNull();
  });

  it("should sum the day tax over taxed payments only", () => {
    const [day] = groupIntoDays(
      [
        makeRow({ receivedAmount: 1000 }),
        makeRow({ receivedAmount: 2000, isTaxExempt: true }),
        makeRow({ receivedAmount: 1500 }),
      ],
      "UTC",
      taxContext()
    );

    expect(day.taxTotal).toBe(150);
    expect(day.total).toBe(4500);
  });

  it("should report a zero day tax when every payment of the day is exempt", () => {
    const [day] = groupIntoDays([makeRow({ isTaxExempt: true })], "UTC", taxContext());

    expect(day.taxTotal).toBe(0);
  });

  it("should total tax and tax-exempt income over the whole period", () => {
    const context = taxContext();
    const days = groupIntoDays(
      [
        makeRow({ paymentDate: "2026-10-03T00:00:00Z", receivedAmount: 1010 }),
        makeRow({ paymentDate: "2026-10-05T00:00:00Z", receivedAmount: 1010 }),
        makeRow({ paymentDate: "2026-10-05T00:00:00Z", receivedAmount: 1000.1, isTaxExempt: true }),
        makeRow({ paymentDate: "2026-10-03T00:00:00Z", receivedAmount: 999.95, isTaxExempt: true }),
      ],
      "UTC",
      context
    );

    expect(days.map((day) => day.taxTotal)).toEqual([61, 61]);
    expect(buildSummary(days, context)).toMatchObject({
      taxTotal: 122,
      taxExemptTotal: 2000.05,
      commissionTotal: null,
    });
  });

  it("should report zero tax totals for an empty period with tax accounting on", () => {
    expect(buildSummary([], taxContext())).toMatchObject({ taxTotal: 0, taxExemptTotal: 0 });
  });

  it("should show the commission credit of a lesson and total the credits", () => {
    const context: IncomeHistoryContext = {
      taxPeriods: null,
      commissionCredits: new Map([
        ["credited-1", 1500],
        ["credited-2", 250.5],
      ]),
    };
    const days = groupIntoDays(
      [
        makeRow({ id: "credited-1", paymentDate: "2026-10-05T00:00:00Z" }),
        makeRow({ id: "credited-2", paymentDate: "2026-10-03T00:00:00Z" }),
        makeRow({ id: "plain", paymentDate: "2026-10-03T00:00:00Z" }),
      ],
      "UTC",
      context
    );

    const credits = Object.fromEntries(
      days.flatMap((day) => day.entries).map((entry) => [entry.lessonId, entry.commissionCredit])
    );
    expect(credits).toEqual({ "credited-1": 1500, "credited-2": 250.5, plain: null });
    expect(buildSummary(days, context).commissionTotal).toBe(1750.5);
  });

  it("should report a zero commission total when students have a commission but nothing was credited", () => {
    const context: IncomeHistoryContext = { taxPeriods: null, commissionCredits: new Map() };
    const days = groupIntoDays([makeRow()], "UTC", context);

    expect(days[0].entries[0].commissionCredit).toBeNull();
    expect(buildSummary(days, context).commissionTotal).toBe(0);
  });

  it("should never reduce the row amount by tax or commission", () => {
    const entry = toEntry(makeRow({ id: "credited", receivedAmount: 2000 }), {
      ...taxContext(),
      commissionCredits: new Map([["credited", 2000]]),
    });

    expect(entry.receivedAmount).toBe(2000);
  });
});

describe("buildIncomeHistoryContext", () => {
  const taxUser = (taxEnabled: boolean) => ({
    taxEnabled,
    taxRatePeriods: [
      { id: "p1", startDate: new Date("2026-01-01T00:00:00Z"), rate: new Prisma.Decimal(6) },
    ],
  });

  const allocationOf = (
    credits: Array<[string, CommissionCredit]>
  ): StudentCommissionAllocation => ({
    student: { id: "s1", commissionAmount: new Prisma.Decimal(3000), archived: false },
    lessons: [],
    allocation: { repaid: 0, remaining: 0, creditByLessonId: new Map(credits) },
  });

  it("should switch tax off when the user has no tax accounting", () => {
    expect(buildIncomeHistoryContext(taxUser(false), []).taxPeriods).toBeNull();
    expect(buildIncomeHistoryContext(null, []).taxPeriods).toBeNull();
  });

  it("should pass the tax periods when tax accounting is on", () => {
    expect(buildIncomeHistoryContext(taxUser(true), []).taxPeriods).toEqual([
      { id: "p1", startDate: "2026-01-01T00:00:00.000Z", rate: 6 },
    ]);
  });

  it("should switch commissions off when no student has a commission", () => {
    expect(buildIncomeHistoryContext(null, []).commissionCredits).toBeNull();
  });

  it("should keep only fact credits", () => {
    const context = buildIncomeHistoryContext(null, [
      allocationOf([
        ["paid", { amount: 1500, state: "FACT" }],
        ["upcoming", { amount: 1500, state: "FORECAST" }],
      ]),
      allocationOf([["other", { amount: 700, state: "FACT" }]]),
    ]);

    expect(context.commissionCredits).toEqual(
      new Map([
        ["paid", 1500],
        ["other", 700],
      ])
    );
  });
});
