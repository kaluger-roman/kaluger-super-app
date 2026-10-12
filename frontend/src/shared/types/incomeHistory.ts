import type { LessonStatus, LessonType, Subject } from "./lesson";

export type IncomeHistoryTax =
  | { kind: "TAXED"; amount: number; rate: number }
  | { kind: "OUTSIDE_PERIODS" }
  | { kind: "EXEMPT" };

export type IncomeHistoryEntry = {
  lessonId: string;
  student: { name: string; archived: boolean } | null;
  prospectName: string | null;
  subject: Subject;
  lessonType: LessonType;
  lessonStartTime: string;
  lessonEndTime: string;
  lessonStatus: LessonStatus;
  price: number;
  receivedAmount: number;
  hasPaymentDate: boolean;
  tax: IncomeHistoryTax | null;
  commissionCredit: number | null;
};

export type IncomeHistoryDay = {
  date: string;
  total: number;
  taxTotal: number | null;
  entries: IncomeHistoryEntry[];
};

export type IncomeHistorySummary = {
  total: number;
  count: number;
  taxTotal: number | null;
  taxExemptTotal: number | null;
  commissionTotal: number | null;
};

export type IncomeHistoryPage = {
  nextCursor: string | null;
  remainingCount: number;
};

export type IncomeHistory = {
  summary: IncomeHistorySummary;
  days: IncomeHistoryDay[];
  page: IncomeHistoryPage;
};
