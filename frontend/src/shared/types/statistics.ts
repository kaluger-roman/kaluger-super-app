import type { TaxBreakdownEntry } from "./taxRate";

export type Statistics = {
  completedLessons: number;
  cancelledLessons: number;
  upcomingLessons: number;
  totalLessons: number;
  earnings: number;
  lastMonthEarnings: number;
  lostEarnings: number;
  upcomingIncome?: number;
  prepaidIncome?: number;
  unpaidDebtSum?: number;
  unpaidDebtCount?: number;
  unpaidDebtOver24hSum?: number;
  unpaidDebtOver24hCount?: number;
  paymentsInRangeSum?: number;
  paymentsInRangeCount?: number;
  trialLessonsCount?: number;
  taxAmount: number | null;
  taxBreakdown: TaxBreakdownEntry[] | null;
};
