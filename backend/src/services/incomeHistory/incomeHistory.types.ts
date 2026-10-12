import type { Prisma } from "@prisma/client";
import type { IncomeHistoryDayDto, IncomeHistoryPageDto, TaxRatePeriodDto } from "../../types";
import type { DateRange } from "../statistics";
import type { INCOME_HISTORY_LESSON_SELECT } from "./incomeHistory.constants";

export type IncomeHistoryInput = {
  userId: string;
  range: DateRange;
  timezone: string;
  before?: string;
  through?: string;
};

export type IncomeHistoryCursor = Pick<IncomeHistoryInput, "before" | "through">;

export type IncomeHistoryLessonRow = Prisma.LessonGetPayload<{
  select: typeof INCOME_HISTORY_LESSON_SELECT;
}>;

export type IncomeHistoryContext = {
  // null when tax accounting is off: no tax mark anywhere in the history
  taxPeriods: TaxRatePeriodDto[] | null;
  // FACT credits by lesson id; null when no student has a commission
  commissionCredits: Map<string, number> | null;
};

export type IncomeHistorySlice = {
  days: IncomeHistoryDayDto[];
  page: IncomeHistoryPageDto;
};
