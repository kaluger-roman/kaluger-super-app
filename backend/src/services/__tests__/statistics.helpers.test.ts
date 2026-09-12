import { Prisma } from "@prisma/client";
import { computeTaxSummary } from "../statistics";

const range = {
  gte: new Date("2026-03-01T00:00:00Z"),
  lte: new Date("2026-03-31T23:59:59Z"),
};

describe("computeTaxSummary", () => {
  it("should return nulls when tax is disabled", () => {
    expect(computeTaxSummary({ taxEnabled: false, taxRatePeriods: [] }, [], range)).toEqual({
      taxAmount: null,
      taxBreakdown: null,
    });
  });

  it("should return nulls when the user is missing or lessons were not loaded", () => {
    expect(computeTaxSummary(null, [], range)).toEqual({
      taxAmount: null,
      taxBreakdown: null,
    });
    expect(computeTaxSummary({ taxEnabled: true, taxRatePeriods: [] }, null, range)).toEqual({
      taxAmount: null,
      taxBreakdown: null,
    });
  });

  it("should compute tax from paid lessons using the period rate", () => {
    const summary = computeTaxSummary(
      {
        taxEnabled: true,
        taxRatePeriods: [
          {
            id: "p1",
            startDate: new Date("2026-01-01T00:00:00Z"),
            rate: new Prisma.Decimal(6),
          },
        ],
      },
      [
        {
          price: new Prisma.Decimal(1000),
          paymentDate: new Date("2026-03-10T00:00:00Z"),
          startTime: new Date("2026-03-09T00:00:00Z"),
        },
        {
          price: new Prisma.Decimal(500),
          paymentDate: null,
          startTime: new Date("2026-03-15T00:00:00Z"),
        },
      ],
      range
    );
    expect(summary.taxAmount).toBe(90);
    expect(summary.taxBreakdown).toEqual([{ rate: 6, earnings: 1500, tax: 90 }]);
  });
});
