import type { IncomeHistory, IncomeHistoryDay } from "@shared";

export const PERIOD = {
  startDate: "2026-08-31T21:00:00.000Z",
  endDate: "2026-09-30T20:59:59.999Z",
};

const makeDay = (date: string, total = 1500): IncomeHistoryDay => ({
  date,
  total,
  taxTotal: null,
  entries: [
    {
      lessonId: `lesson-${date}`,
      student: { name: "Анна", archived: false },
      prospectName: null,
      subject: "MATHEMATICS",
      lessonType: "SCHOOL",
      lessonStartTime: `${date}T10:00:00.000Z`,
      lessonEndTime: `${date}T11:00:00.000Z`,
      lessonStatus: "COMPLETED",
      price: total,
      receivedAmount: total,
      hasPaymentDate: true,
      tax: null,
      commissionCredit: null,
    },
  ],
});

export const makeHistory = (
  dates: string[],
  page: IncomeHistory["page"] = { nextCursor: null, remainingCount: 0 },
  total = dates.length * 1500
): IncomeHistory => ({
  summary: {
    total,
    count: dates.length + page.remainingCount,
    taxTotal: null,
    taxExemptTotal: null,
    commissionTotal: null,
  },
  days: dates.map((date) => makeDay(date)),
  page,
});

export const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
