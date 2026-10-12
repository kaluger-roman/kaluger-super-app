import type { LessonStatus, LessonType, Subject } from "@prisma/client";

export type IncomeHistoryTaxDto =
  | { kind: "TAXED"; amount: number; rate: number }
  | { kind: "OUTSIDE_PERIODS" }
  | { kind: "EXEMPT" };

export type IncomeHistoryEntryDto = {
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
  tax: IncomeHistoryTaxDto | null;
  commissionCredit: number | null;
};

export type IncomeHistoryDayDto = {
  date: string;
  total: number;
  taxTotal: number | null;
  entries: IncomeHistoryEntryDto[];
};

export type IncomeHistorySummaryDto = {
  total: number;
  count: number;
  taxTotal: number | null;
  taxExemptTotal: number | null;
  commissionTotal: number | null;
};

export type IncomeHistoryPageDto = {
  nextCursor: string | null;
  remainingCount: number;
};

export type IncomeHistoryDto = {
  summary: IncomeHistorySummaryDto;
  days: IncomeHistoryDayDto[];
  page: IncomeHistoryPageDto;
};

export type IncomeHistoryQuery = {
  startDate?: string;
  endDate?: string;
  before?: string;
  through?: string;
};
