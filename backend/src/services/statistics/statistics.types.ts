import type { Prisma } from "@prisma/client";
import type { TaxBreakdownEntry } from "../../types";

export type DateRange = { gte: Date; lte: Date };

export type LessonStatisticsInput = {
  userId: string;
  where: Prisma.LessonWhereInput;
  paymentDateRange: DateRange;
  lastMonthRange: DateRange;
  now: Date;
};

export type TaxSummary = {
  taxAmount: number | null;
  taxBreakdown: TaxBreakdownEntry[] | null;
};

export type TaxUser = {
  taxEnabled: boolean;
  taxRatePeriods: Array<{ id: string; startDate: Date; rate: Prisma.Decimal }>;
};

export type PaidLessonForTax = {
  price: Prisma.Decimal | null;
  paymentDate: Date | null;
  startTime: Date;
};

export type LessonStatistics = TaxSummary & {
  completedLessons: number;
  cancelledLessons: number;
  totalLessons: number;
  upcomingLessons: number;
  earnings: number;
  lastMonthEarnings: number;
  lostEarnings: number;
  prepaidIncome: number;
  upcomingIncome: number;
  trialLessonsCount: number;
  unpaidDebtSum: number;
  unpaidDebtCount: number;
  unpaidDebtOver24hSum: number;
  unpaidDebtOver24hCount: number;
  paymentsInRangeSum: number;
  paymentsInRangeCount: number;
};
