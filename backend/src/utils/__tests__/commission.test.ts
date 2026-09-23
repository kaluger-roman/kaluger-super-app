import { allocateCommission } from "../commission";
import type { CommissionLessonInput } from "../../types";

const lesson = (
  overrides: Partial<CommissionLessonInput> & { id: string }
): CommissionLessonInput => ({
  startTime: new Date("2026-03-01T10:00:00.000Z"),
  paymentDate: null,
  price: 1000,
  status: "COMPLETED" as const,
  isPaid: true,
  ...overrides,
});

const paidSeries = (prices: number[]) =>
  prices.map((price, index) =>
    lesson({
      id: `l${index + 1}`,
      price,
      startTime: new Date(Date.UTC(2026, 2, index + 1, 10, 0, 0)),
    })
  );

const creditsOf = (allocation: ReturnType<typeof allocateCommission>) =>
  [...allocation.creditByLessonId.entries()].map(([id, credit]) => ({ id, ...credit }));

describe("allocateCommission", () => {
  it("should credit lessons chronologically until the commission is exhausted", () => {
    const allocation = allocateCommission({
      commissionAmount: 2500,
      lessons: paidSeries([1000, 1000, 1000, 1000]),
    });

    expect(creditsOf(allocation)).toEqual([
      { id: "l1", amount: 1000, state: "FACT" },
      { id: "l2", amount: 1000, state: "FACT" },
      { id: "l3", amount: 500, state: "FACT" },
    ]);
    expect(allocation.repaid).toBe(2500);
    expect(allocation.remaining).toBe(0);
  });

  it("should return nothing when the commission is zero", () => {
    const allocation = allocateCommission({
      commissionAmount: 0,
      lessons: paidSeries([1000, 1000]),
    });

    expect(allocation.creditByLessonId.size).toBe(0);
    expect(allocation.repaid).toBe(0);
    expect(allocation.remaining).toBe(0);
  });

  it("should credit every lesson in full when the commission exceeds their total price", () => {
    const allocation = allocateCommission({
      commissionAmount: 10000,
      lessons: paidSeries([1000, 1000]),
    });

    expect(creditsOf(allocation)).toEqual([
      { id: "l1", amount: 1000, state: "FACT" },
      { id: "l2", amount: 1000, state: "FACT" },
    ]);
    expect(allocation.repaid).toBe(2000);
    expect(allocation.remaining).toBe(8000);
  });

  it("should skip free lessons without consuming the remaining commission", () => {
    const allocation = allocateCommission({
      commissionAmount: 1500,
      lessons: [
        lesson({ id: "free", price: 0, startTime: new Date("2026-03-01T10:00:00.000Z") }),
        lesson({ id: "null", price: null, startTime: new Date("2026-03-02T10:00:00.000Z") }),
        lesson({ id: "paid", price: 1000, startTime: new Date("2026-03-03T10:00:00.000Z") }),
      ],
    });

    expect(creditsOf(allocation)).toEqual([{ id: "paid", amount: 1000, state: "FACT" }]);
    expect(allocation.repaid).toBe(1000);
    expect(allocation.remaining).toBe(500);
  });

  it("should pass a cancelled lesson's share on to the next lessons", () => {
    const allocation = allocateCommission({
      commissionAmount: 1500,
      lessons: [
        lesson({
          id: "cancelled",
          status: "CANCELLED",
          startTime: new Date("2026-03-01T10:00:00.000Z"),
        }),
        lesson({ id: "l2", startTime: new Date("2026-03-02T10:00:00.000Z") }),
        lesson({ id: "l3", startTime: new Date("2026-03-03T10:00:00.000Z") }),
      ],
    });

    expect(creditsOf(allocation)).toEqual([
      { id: "l2", amount: 1000, state: "FACT" },
      { id: "l3", amount: 500, state: "FACT" },
    ]);
  });

  it("should mark a completed but unpaid lesson as a forecast, not a fact", () => {
    const allocation = allocateCommission({
      commissionAmount: 1500,
      lessons: [
        lesson({ id: "unpaid", isPaid: false, startTime: new Date("2026-03-01T10:00:00.000Z") }),
        lesson({ id: "paid", startTime: new Date("2026-03-02T10:00:00.000Z") }),
      ],
    });

    expect(allocation.creditByLessonId.get("paid")).toEqual({ amount: 1000, state: "FACT" });
    expect(allocation.creditByLessonId.get("unpaid")).toEqual({ amount: 500, state: "FORECAST" });
    expect(allocation.repaid).toBe(1000);
    expect(allocation.remaining).toBe(500);
  });

  it("should forecast upcoming lessons in every active status", () => {
    const allocation = allocateCommission({
      commissionAmount: 2500,
      lessons: [
        lesson({
          id: "scheduled",
          status: "SCHEDULED",
          isPaid: false,
          startTime: new Date("2026-03-01T10:00:00.000Z"),
        }),
        lesson({
          id: "rescheduled",
          status: "RESCHEDULED",
          isPaid: false,
          startTime: new Date("2026-03-02T10:00:00.000Z"),
        }),
        lesson({
          id: "inProgress",
          status: "IN_PROGRESS",
          isPaid: false,
          startTime: new Date("2026-03-03T10:00:00.000Z"),
        }),
      ],
    });

    expect(creditsOf(allocation)).toEqual([
      { id: "scheduled", amount: 1000, state: "FORECAST" },
      { id: "rescheduled", amount: 1000, state: "FORECAST" },
      { id: "inProgress", amount: 500, state: "FORECAST" },
    ]);
    expect(allocation.repaid).toBe(0);
    expect(allocation.remaining).toBe(2500);
  });

  it("should start the forecast from what is left after the fact pass", () => {
    const allocation = allocateCommission({
      commissionAmount: 2500,
      lessons: [
        lesson({ id: "paid", startTime: new Date("2026-03-01T10:00:00.000Z") }),
        lesson({
          id: "next",
          status: "SCHEDULED",
          isPaid: false,
          startTime: new Date("2026-03-02T10:00:00.000Z"),
        }),
        lesson({
          id: "last",
          status: "SCHEDULED",
          isPaid: false,
          startTime: new Date("2026-03-03T10:00:00.000Z"),
        }),
      ],
    });

    expect(creditsOf(allocation)).toEqual([
      { id: "paid", amount: 1000, state: "FACT" },
      { id: "next", amount: 1000, state: "FORECAST" },
      { id: "last", amount: 500, state: "FORECAST" },
    ]);
  });

  it("should not forecast anything once the commission is fully repaid", () => {
    const allocation = allocateCommission({
      commissionAmount: 1000,
      lessons: [
        lesson({ id: "paid", startTime: new Date("2026-03-01T10:00:00.000Z") }),
        lesson({
          id: "next",
          status: "SCHEDULED",
          isPaid: false,
          startTime: new Date("2026-03-02T10:00:00.000Z"),
        }),
      ],
    });

    expect(creditsOf(allocation)).toEqual([{ id: "paid", amount: 1000, state: "FACT" }]);
  });

  it("should close the commission on the lesson whose price matches the remainder exactly", () => {
    const allocation = allocateCommission({
      commissionAmount: 2000,
      lessons: paidSeries([1000, 1000, 1000]),
    });

    expect(allocation.creditByLessonId.has("l3")).toBe(false);
    expect(allocation.repaid).toBe(2000);
    expect(allocation.remaining).toBe(0);
  });

  it("should keep kopecks exact when the remainder is below one rouble", () => {
    const allocation = allocateCommission({
      commissionAmount: 1000.55,
      lessons: paidSeries([1000, 1000]),
    });

    expect(allocation.creditByLessonId.get("l2")).toEqual({ amount: 0.55, state: "FACT" });
    expect(allocation.repaid).toBe(1000.55);
    expect(allocation.remaining).toBe(0);
  });

  it("should keep repaid plus remaining exactly equal to the commission on fractional data", () => {
    const allocation = allocateCommission({
      commissionAmount: 0.3,
      lessons: paidSeries([0.1, 0.2, 1000]),
    });

    expect(allocation.repaid + allocation.remaining).toBe(0.3);
    expect(allocation.repaid).toBe(0.3);
  });

  it("should order lessons sharing a start time deterministically by id", () => {
    const sameTime = new Date("2026-03-01T10:00:00.000Z");
    const input = [
      lesson({ id: "b", startTime: sameTime }),
      lesson({ id: "a", startTime: sameTime }),
    ];

    const first = allocateCommission({ commissionAmount: 1000, lessons: input });
    const second = allocateCommission({ commissionAmount: 1000, lessons: [...input].reverse() });

    expect(creditsOf(first)).toEqual([{ id: "a", amount: 1000, state: "FACT" }]);
    expect(creditsOf(second)).toEqual(creditsOf(first));
  });

  it("should drop the extra credits when the commission is lowered below the credited sum", () => {
    const lessons = paidSeries([1000, 1000, 1000]);

    const before = allocateCommission({ commissionAmount: 2500, lessons });
    const after = allocateCommission({ commissionAmount: 1200, lessons });

    expect(before.creditByLessonId.size).toBe(3);
    expect(creditsOf(after)).toEqual([
      { id: "l1", amount: 1000, state: "FACT" },
      { id: "l2", amount: 200, state: "FACT" },
    ]);
    expect(after.repaid).toBe(1200);
    expect(after.remaining).toBe(0);
  });

  it("should never credit a lesson twice across the two passes", () => {
    const allocation = allocateCommission({
      commissionAmount: 5000,
      lessons: [
        lesson({ id: "paid", startTime: new Date("2026-03-01T10:00:00.000Z") }),
        lesson({
          id: "upcoming",
          status: "SCHEDULED",
          isPaid: false,
          startTime: new Date("2026-03-02T10:00:00.000Z"),
        }),
      ],
    });

    const total = [...allocation.creditByLessonId.values()].reduce(
      (sum, credit) => sum + credit.amount,
      0
    );

    expect(allocation.creditByLessonId.size).toBe(2);
    expect(total).toBeLessThanOrEqual(5000);
    expect(allocation.repaid).toBe(1000);
  });

  it("should not let a forecast change repaid or remaining", () => {
    const paidOnly = allocateCommission({
      commissionAmount: 3000,
      lessons: [lesson({ id: "paid" })],
    });
    const withForecast = allocateCommission({
      commissionAmount: 3000,
      lessons: [
        lesson({ id: "paid" }),
        lesson({
          id: "upcoming",
          status: "SCHEDULED",
          isPaid: false,
          startTime: new Date("2026-03-05T10:00:00.000Z"),
        }),
      ],
    });

    expect(withForecast.repaid).toBe(paidOnly.repaid);
    expect(withForecast.remaining).toBe(paidOnly.remaining);
  });

  it("should return an empty allocation for a negative commission", () => {
    const allocation = allocateCommission({
      commissionAmount: -500,
      lessons: paidSeries([1000]),
    });

    expect(allocation.creditByLessonId.size).toBe(0);
    expect(allocation.repaid).toBe(0);
    expect(allocation.remaining).toBe(0);
  });

  it("should handle an empty lesson list", () => {
    const allocation = allocateCommission({ commissionAmount: 1000, lessons: [] });

    expect(allocation.creditByLessonId.size).toBe(0);
    expect(allocation.repaid).toBe(0);
    expect(allocation.remaining).toBe(1000);
  });
  // Regression: the write-off lands in a period by payment date, so allocation
  // must follow the same order — otherwise paying an early lesson late would
  // rewrite the figure of an already closed period.
  it("should credit lessons in payment order, not lesson order", () => {
    const later = lesson({
      id: "l2",
      startTime: new Date(Date.UTC(2026, 2, 2, 10, 0, 0)),
      paymentDate: new Date(Date.UTC(2026, 2, 2, 12, 0, 0)),
    });
    const earlierTaughtPaidLater = lesson({
      id: "l1",
      startTime: new Date(Date.UTC(2026, 2, 1, 10, 0, 0)),
      paymentDate: new Date(Date.UTC(2026, 3, 5, 12, 0, 0)),
    });

    const allocation = allocateCommission({
      commissionAmount: 1500,
      lessons: [earlierTaughtPaidLater, later],
    });

    expect(allocation.creditByLessonId.get("l2")).toEqual({ amount: 1000, state: "FACT" });
    expect(allocation.creditByLessonId.get("l1")).toEqual({ amount: 500, state: "FACT" });
  });

  it("should fall back to the lesson date when a paid lesson has no payment date", () => {
    const withoutPaymentDate = lesson({
      id: "l1",
      startTime: new Date(Date.UTC(2026, 2, 1, 10, 0, 0)),
    });
    const paidLater = lesson({
      id: "l2",
      startTime: new Date(Date.UTC(2026, 2, 2, 10, 0, 0)),
      paymentDate: new Date(Date.UTC(2026, 2, 3, 12, 0, 0)),
    });

    const allocation = allocateCommission({
      commissionAmount: 1500,
      lessons: [paidLater, withoutPaymentDate],
    });

    expect(allocation.creditByLessonId.get("l1")).toEqual({ amount: 1000, state: "FACT" });
    expect(allocation.creditByLessonId.get("l2")).toEqual({ amount: 500, state: "FACT" });
  });

  it("should walk forecast lessons in lesson order even when facts came in payment order", () => {
    const paid = lesson({
      id: "paid",
      startTime: new Date(Date.UTC(2026, 2, 10, 10, 0, 0)),
      paymentDate: new Date(Date.UTC(2026, 2, 10, 12, 0, 0)),
      price: 500,
    });
    const upcomingLater = lesson({
      id: "upcoming-2",
      startTime: new Date(Date.UTC(2026, 3, 2, 10, 0, 0)),
      status: "SCHEDULED",
      isPaid: false,
    });
    const upcomingSooner = lesson({
      id: "upcoming-1",
      startTime: new Date(Date.UTC(2026, 3, 1, 10, 0, 0)),
      status: "SCHEDULED",
      isPaid: false,
    });

    const allocation = allocateCommission({
      commissionAmount: 1500,
      lessons: [upcomingLater, paid, upcomingSooner],
    });

    expect(allocation.creditByLessonId.get("upcoming-1")).toEqual({
      amount: 1000,
      state: "FORECAST",
    });
    expect(allocation.creditByLessonId.get("upcoming-2")).toBeUndefined();
  });
});
