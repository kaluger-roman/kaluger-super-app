import { buildTaxBreakdown, calcLessonTax, resolveRate } from "../taxRate";
import type { TaxRatePeriodDto } from "../../types";

const makePeriod = (
  startDate: string,
  rate: number,
  id = startDate,
): TaxRatePeriodDto => ({ id, startDate, rate });

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
});

describe("calcLessonTax", () => {
  it("should round per lesson", () => {
    expect(calcLessonTax(10000, 6)).toBe(600);
    expect(calcLessonTax(333.34, 6)).toBe(20);
    expect(calcLessonTax(1000, 6.5)).toBe(65);
    expect(calcLessonTax(1000, 0)).toBe(0);
  });
});

describe("buildTaxBreakdown", () => {
  it("returns zeros for empty input", () => {
    expect(buildTaxBreakdown([], [])).toEqual({
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
    const result = buildTaxBreakdown(lessons, periods);
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
    const result = buildTaxBreakdown(lessons, periods);
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
    const result = buildTaxBreakdown(lessons, periods);
    expect(result.taxBreakdown).toEqual([
      { rate: 0, earnings: 5000, tax: 0, isOutsidePeriods: true },
      { rate: 6, earnings: 10000, tax: 600 },
    ]);
    expect(result.taxAmount).toBe(600);
  });

  it("rounds tax per lesson, not per total", () => {
    const periods = [makePeriod("2024-01-01", 6)];
    const lessons = [
      { price: 333.34, paymentDate: new Date("2025-03-01") },
      { price: 333.34, paymentDate: new Date("2025-03-02") },
      { price: 333.34, paymentDate: new Date("2025-03-03") },
    ];
    const result = buildTaxBreakdown(lessons, periods);
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
    const result = buildTaxBreakdown(lessons, periods);
    expect(result.taxAmount).toBe(1200);
    expect(result.taxBreakdown).toEqual([
      { rate: 6, earnings: 20000, tax: 1200 },
    ]);
  });

  it("returns zeros when taxEnabled scenario has no periods (caller guarded)", () => {
    const lessons = [
      { price: 10000, paymentDate: new Date("2025-03-01") },
    ];
    const result = buildTaxBreakdown(lessons, []);
    expect(result.taxAmount).toBe(0);
    expect(result.taxBreakdown).toEqual([
      { rate: 0, earnings: 10000, tax: 0, isOutsidePeriods: true },
    ]);
  });
});
