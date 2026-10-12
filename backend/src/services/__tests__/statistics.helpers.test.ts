import { Prisma } from "@prisma/client";
import type { PaidLessonForTax, TaxUser } from "../statistics";
import { computeTaxSummary, paidInRangeWhere } from "../statistics";

const range = {
  gte: new Date("2026-03-01T00:00:00Z"),
  lte: new Date("2026-03-31T23:59:59Z"),
};

const taxUser = (startDate = "2026-01-01T00:00:00Z"): TaxUser => ({
  taxEnabled: true,
  taxRatePeriods: [{ id: "p1", startDate: new Date(startDate), rate: new Prisma.Decimal(6) }],
});

const paid = (
  receivedAmount: number,
  isTaxExempt: boolean,
  paymentDate: string | null = "2026-03-10T00:00:00Z"
): PaidLessonForTax => ({
  receivedAmount: new Prisma.Decimal(receivedAmount),
  paymentDate: paymentDate === null ? null : new Date(paymentDate),
  startTime: new Date("2026-03-15T00:00:00Z"),
  isTaxExempt,
});

describe("paidInRangeWhere", () => {
  it("should select paid lessons with a positive received amount by payment date or start time", () => {
    expect(paidInRangeWhere("tutor-1", range)).toEqual({
      tutorId: "tutor-1",
      isPaid: true,
      receivedAmount: { gt: 0 },
      OR: [{ paymentDate: range }, { paymentDate: null, startTime: range }],
    });
  });

  it("should not filter by price", () => {
    expect(paidInRangeWhere("tutor-1", range)).not.toHaveProperty("price");
  });
});

describe("computeTaxSummary", () => {
  it("should return nulls when tax is disabled", () => {
    expect(
      computeTaxSummary({ taxEnabled: false, taxRatePeriods: [] }, [paid(1000, true)], range)
    ).toEqual({
      taxAmount: null,
      taxBreakdown: null,
      taxExemptIncome: null,
    });
  });

  it("should return nulls when the user is missing or lessons were not loaded", () => {
    expect(computeTaxSummary(null, [], range)).toEqual({
      taxAmount: null,
      taxBreakdown: null,
      taxExemptIncome: null,
    });
    expect(computeTaxSummary({ taxEnabled: true, taxRatePeriods: [] }, null, range)).toEqual({
      taxAmount: null,
      taxBreakdown: null,
      taxExemptIncome: null,
    });
  });

  it("should compute tax from paid lessons using the period rate", () => {
    const summary = computeTaxSummary(
      taxUser(),
      [paid(1000, false), paid(500, false, null)],
      range
    );
    expect(summary).toEqual({
      taxAmount: 90,
      taxBreakdown: [{ rate: 6, earnings: 1500, tax: 90 }],
      taxExemptIncome: 0,
    });
  });

  it("should exclude tax-exempt payments from the tax and report their sum", () => {
    const summary = computeTaxSummary(taxUser(), [paid(1000, false), paid(2000, true)], range);
    expect(summary).toEqual({
      taxAmount: 60,
      taxBreakdown: [{ rate: 6, earnings: 1000, tax: 60 }],
      taxExemptIncome: 2000,
    });
  });

  it("should keep the rate row with zero earnings when every payment is tax-exempt", () => {
    const summary = computeTaxSummary(taxUser(), [paid(2000, true)], range);
    expect(summary).toEqual({
      taxAmount: 0,
      taxBreakdown: [{ rate: 6, earnings: 0, tax: 0 }],
      taxExemptIncome: 2000,
    });
  });

  it("should leave tax-exempt payments out of the outside-periods row", () => {
    const summary = computeTaxSummary(
      taxUser("2026-03-15T00:00:00Z"),
      [paid(1000, false, "2026-03-05T00:00:00Z"), paid(2000, true, "2026-03-06T00:00:00Z")],
      range
    );
    expect(summary).toEqual({
      taxAmount: 0,
      taxBreakdown: [
        { rate: 0, earnings: 1000, tax: 0, isOutsidePeriods: true },
        { rate: 6, earnings: 0, tax: 0 },
      ],
      taxExemptIncome: 2000,
    });
  });

  it("should count a tax-exempt payment without paymentDate", () => {
    const summary = computeTaxSummary(
      taxUser(),
      [paid(1000, false, null), paid(2000, true, null)],
      range
    );
    expect(summary.taxAmount).toBe(60);
    expect(summary.taxExemptIncome).toBe(2000);
  });

  it("should sum tax-exempt payments to the exact kopeck", () => {
    const summary = computeTaxSummary(taxUser(), [paid(1000.1, true), paid(999.95, true)], range);
    expect(summary.taxExemptIncome).toBe(2000.05);
  });

  it("should keep per-payment tax rounding of taxable lessons unchanged", () => {
    const taxable = [paid(1010, false), paid(1010, false)];
    const withoutExempt = computeTaxSummary(taxUser(), taxable, range);
    const withExempt = computeTaxSummary(taxUser(), [...taxable, paid(777, true)], range);
    expect(withoutExempt.taxAmount).toBe(122);
    expect(withExempt.taxAmount).toBe(withoutExempt.taxAmount);
    expect(withExempt.taxBreakdown).toEqual(withoutExempt.taxBreakdown);
  });
});
