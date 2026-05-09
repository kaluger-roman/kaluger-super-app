import {
  buildTaxBreakdown,
  calcLessonTax,
  computeRatesInRange,
  resolveRate,
} from "../taxRate";
import type { TaxRatePeriodDto } from "../../types";

const makePeriod = (
  startDate: string,
  rate: number,
  id = startDate,
): TaxRatePeriodDto => ({ id, startDate, rate });

const range = (start: string, end: string) => ({
  start: new Date(start),
  end: new Date(end),
});

describe("resolveRate", () => {
  it("should return 0 when no periods are configured", () => {
    expect(resolveRate(new Date("2025-05-15"), [])).toBe(0);
  });

  it("should return 0 when payment date is before earliest period", () => {
    const periods = [makePeriod("2024-01-01", 6)];
    expect(resolveRate(new Date("2023-09-01"), periods)).toBe(0);
  });

  it("should return rate of single period when payment is on or after start", () => {
    const periods = [makePeriod("2024-01-01", 6)];
    expect(resolveRate(new Date("2024-01-01"), periods)).toBe(6);
    expect(resolveRate(new Date("2030-01-01"), periods)).toBe(6);
  });

  it("should pick the latest period whose start <= payment date", () => {
    const periods = [
      makePeriod("2024-01-01", 6),
      makePeriod("2025-06-01", 4),
      makePeriod("2026-01-01", 13),
    ];
    expect(resolveRate(new Date("2025-05-31"), periods)).toBe(6);
    expect(resolveRate(new Date("2025-06-01"), periods)).toBe(4);
    expect(resolveRate(new Date("2025-12-31"), periods)).toBe(4);
    expect(resolveRate(new Date("2026-06-01"), periods)).toBe(13);
  });

  it("should return correct rate when periods are passed in unsorted order", () => {
    const unsorted = [
      makePeriod("2026-01-01", 13),
      makePeriod("2024-01-01", 6),
      makePeriod("2025-06-01", 4),
    ];
    expect(resolveRate(new Date("2025-05-31"), unsorted)).toBe(6);
    expect(resolveRate(new Date("2025-06-01"), unsorted)).toBe(4);
    expect(resolveRate(new Date("2026-06-01"), unsorted)).toBe(13);
  });
});

describe("calcLessonTax", () => {
  it("should round per lesson", () => {
    expect(calcLessonTax(10000, 6)).toBe(600);
    expect(calcLessonTax(333.34, 6)).toBe(20);
    expect(calcLessonTax(1000, 6.5)).toBe(65);
    expect(calcLessonTax(1000, 0)).toBe(0);
  });
});

describe("computeRatesInRange", () => {
  it("returns only the period rate when filter sits entirely inside it", () => {
    const periods = [makePeriod("2026-01-01", 4)];
    const rates = computeRatesInRange(
      periods,
      new Date("2026-02-01"),
      new Date("2026-05-09"),
    );
    expect(rates).toEqual([{ rate: 4, isOutsidePeriods: false }]);
  });

  it("includes 0%-zone when filter starts before earliest period", () => {
    const periods = [makePeriod("2026-01-01", 4)];
    const rates = computeRatesInRange(
      periods,
      new Date("2025-05-01"),
      new Date("2026-05-09"),
    );
    expect(rates).toEqual([
      { rate: 0, isOutsidePeriods: true },
      { rate: 4, isOutsidePeriods: false },
    ]);
  });

  it("returns only 0%-zone when filter ends before earliest period", () => {
    const periods = [makePeriod("2026-01-01", 4)];
    const rates = computeRatesInRange(
      periods,
      new Date("2024-01-01"),
      new Date("2025-12-31"),
    );
    expect(rates).toEqual([{ rate: 0, isOutsidePeriods: true }]);
  });

  it("picks all overlapping period rates without dupes", () => {
    const periods = [
      makePeriod("2024-01-01", 6),
      makePeriod("2025-06-01", 4),
      makePeriod("2026-01-01", 13),
    ];
    const rates = computeRatesInRange(
      periods,
      new Date("2025-05-15"),
      new Date("2026-02-01"),
    );
    expect(rates).toEqual([
      { rate: 6, isOutsidePeriods: false },
      { rate: 4, isOutsidePeriods: false },
      { rate: 13, isOutsidePeriods: false },
    ]);
  });
});

describe("buildTaxBreakdown", () => {
  it("returns zeros for empty input", () => {
    expect(
      buildTaxBreakdown([], [], range("2024-01-01", "2024-12-31")),
    ).toEqual({
      taxAmount: 0,
      taxBreakdown: [],
    });
  });

  it("aggregates lessons under the single applicable rate", () => {
    const periods = [makePeriod("2024-01-01", 6)];
    const lessons = [
      { price: 10000, paymentDate: new Date("2025-03-01") },
      { price: 20000, paymentDate: new Date("2025-04-01") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      periods,
      range("2025-01-01", "2025-12-31"),
    );
    expect(result.taxAmount).toBe(1800);
    expect(result.taxBreakdown).toEqual([
      { rate: 6, earnings: 30000, tax: 1800 },
    ]);
  });

  it("splits across two rates by paymentDate, sorted by rate asc", () => {
    const periods = [
      makePeriod("2024-01-01", 6),
      makePeriod("2025-06-01", 4),
    ];
    const lessons = [
      { price: 10000, paymentDate: new Date("2025-05-15") },
      { price: 15000, paymentDate: new Date("2025-07-15") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      periods,
      range("2025-05-01", "2025-08-01"),
    );
    expect(result.taxBreakdown).toEqual([
      { rate: 4, earnings: 15000, tax: 600 },
      { rate: 6, earnings: 10000, tax: 600 },
    ]);
    expect(result.taxAmount).toBe(1200);
  });

  it("creates an isOutsidePeriods bucket for payments before earliest period", () => {
    const periods = [makePeriod("2024-01-01", 6)];
    const lessons = [
      { price: 5000, paymentDate: new Date("2023-09-01") },
      { price: 10000, paymentDate: new Date("2024-03-01") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      periods,
      range("2023-01-01", "2024-12-31"),
    );
    expect(result.taxBreakdown).toEqual([
      { rate: 0, earnings: 5000, tax: 0, isOutsidePeriods: true },
      { rate: 6, earnings: 10000, tax: 600 },
    ]);
    expect(result.taxAmount).toBe(600);
  });

  it("surfaces 0%-zone with zero amounts when filter spans it but no payments fell there", () => {
    const periods = [makePeriod("2026-01-01", 4)];
    const lessons = [
      { price: 50000, paymentDate: new Date("2026-02-01") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      periods,
      range("2025-05-01", "2026-05-09"),
    );
    expect(result.taxBreakdown).toEqual([
      { rate: 0, earnings: 0, tax: 0, isOutsidePeriods: true },
      { rate: 4, earnings: 50000, tax: 2000 },
    ]);
    expect(result.taxAmount).toBe(2000);
  });

  it("surfaces an in-range period with zero amounts when no payments hit it", () => {
    const periods = [
      makePeriod("2024-01-01", 6),
      makePeriod("2026-01-01", 4),
    ];
    const lessons = [
      { price: 10000, paymentDate: new Date("2025-03-01") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      periods,
      range("2025-01-01", "2026-05-09"),
    );
    expect(result.taxBreakdown).toEqual([
      { rate: 4, earnings: 0, tax: 0 },
      { rate: 6, earnings: 10000, tax: 600 },
    ]);
    expect(result.taxAmount).toBe(600);
  });

  it("does not duplicate buckets when actual breakdown already contains the in-range rate", () => {
    const periods = [makePeriod("2026-01-01", 4)];
    const lessons = [
      { price: 1000, paymentDate: new Date("2026-02-01") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      periods,
      range("2026-01-01", "2026-05-09"),
    );
    expect(result.taxBreakdown).toEqual([
      { rate: 4, earnings: 1000, tax: 40 },
    ]);
  });

  it("rounds tax per lesson, not per total", () => {
    const periods = [makePeriod("2024-01-01", 6)];
    const lessons = [
      { price: 333.34, paymentDate: new Date("2025-03-01") },
      { price: 333.34, paymentDate: new Date("2025-03-02") },
      { price: 333.34, paymentDate: new Date("2025-03-03") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      periods,
      range("2025-01-01", "2025-12-31"),
    );
    expect(result.taxAmount).toBe(60);
    expect(result.taxBreakdown[0].tax).toBe(60);
  });

  it("ignores lessons without price or paymentDate", () => {
    const periods = [makePeriod("2024-01-01", 6)];
    const lessons = [
      { price: null, paymentDate: new Date("2025-03-01") },
      { price: 10000, paymentDate: null },
      { price: 20000, paymentDate: new Date("2025-03-02") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      periods,
      range("2025-01-01", "2025-12-31"),
    );
    expect(result.taxAmount).toBe(1200);
    expect(result.taxBreakdown).toEqual([
      { rate: 6, earnings: 20000, tax: 1200 },
    ]);
  });

  it("returns zeros when taxEnabled scenario has no periods (caller guarded)", () => {
    const lessons = [
      { price: 10000, paymentDate: new Date("2025-03-01") },
    ];
    const result = buildTaxBreakdown(
      lessons,
      [],
      range("2025-01-01", "2025-12-31"),
    );
    expect(result.taxAmount).toBe(0);
    expect(result.taxBreakdown).toEqual([
      { rate: 0, earnings: 10000, tax: 0, isOutsidePeriods: true },
    ]);
  });
});
