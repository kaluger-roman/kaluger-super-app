import { formatCurrency } from "@shared";
import type { IncomeHistory, IncomeHistoryDay, IncomeHistoryEntry } from "@shared";

// Testing Library collapses the non-breaking spaces of the rendered amount.
export const money = (amount: number, withKopecks = false) =>
  formatCurrency(amount, { withKopecks }).replace(/\s/g, " ");

const localIso = (month: number, day: number, hour: number, minute = 0) =>
  new Date(2026, month, day, hour, minute).toISOString();

export const makeEntry = (overrides: Partial<IncomeHistoryEntry> = {}): IncomeHistoryEntry => ({
  lessonId: "lesson-1",
  student: { name: "Анна Смирнова", archived: false },
  prospectName: null,
  subject: "MATHEMATICS",
  lessonType: "EGE",
  lessonStartTime: localIso(9, 13, 16),
  lessonEndTime: localIso(9, 13, 17, 30),
  lessonStatus: "COMPLETED",
  price: 2000,
  receivedAmount: 2000,
  hasPaymentDate: true,
  tax: null,
  commissionCredit: null,
  ...overrides,
});

export const makeDay = (
  date: string,
  entries: IncomeHistoryEntry[] = [makeEntry({ lessonId: `lesson-${date}` })],
  overrides: Partial<IncomeHistoryDay> = {}
): IncomeHistoryDay => ({
  date,
  total: entries.reduce((sum, entry) => sum + entry.receivedAmount, 0),
  taxTotal: null,
  entries,
  ...overrides,
});

export const makeHistory = (
  days: IncomeHistoryDay[],
  page: IncomeHistory["page"] = { nextCursor: null, remainingCount: 0 }
): IncomeHistory => ({
  summary: {
    total: days.reduce((sum, day) => sum + day.total, 0),
    count: days.reduce((count, day) => count + day.entries.length, 0) + page.remainingCount,
    taxTotal: null,
    taxExemptTotal: null,
    commissionTotal: null,
  },
  days,
  page,
});

export const EMPTY_HISTORY = makeHistory([]);

export const APPLIED_RANGE = {
  startDate: localIso(8, 1, 0),
  endDate: new Date(2026, 8, 30, 23, 59, 59, 999).toISOString(),
};
