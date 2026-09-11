import type { Prisma } from "@prisma/client";
import type { TaxRatePeriodDto } from "../../types";
import { buildTaxBreakdown } from "../taxRate";
import type {
  DateRange,
  PaidLessonForTax,
  TaxSummary,
  TaxUser,
} from "./statistics.types";

export const decimalToNumber = (value: Prisma.Decimal | null | undefined) =>
  value?.toNumber() ?? 0;

// Lessons that contributed money in the filter window. Primary signal
// is `paymentDate`, but legacy/imported lessons may be marked as paid
// without one — for those we fall back to `startTime` so the income
// still surfaces in the period it was earned.
export const paidInRangeWhere = (
  userId: string,
  range: DateRange,
): Prisma.LessonWhereInput => ({
  tutorId: userId,
  isPaid: true,
  price: { gt: 0 },
  OR: [{ paymentDate: range }, { paymentDate: null, startTime: range }],
});

export const computeTaxSummary = (
  user: TaxUser | null,
  paidLessons: PaidLessonForTax[] | null,
  range: DateRange,
): TaxSummary => {
  if (!user?.taxEnabled || !paidLessons) {
    return { taxAmount: null, taxBreakdown: null };
  }

  const periods: TaxRatePeriodDto[] = user.taxRatePeriods.map((period) => ({
    id: period.id,
    startDate: period.startDate.toISOString(),
    rate: period.rate.toNumber(),
  }));
  // Pass the effective date (paymentDate ?? startTime) so legacy paid
  // lessons without a paymentDate still get a rate assigned.
  const lessonsForTax = paidLessons.map((lesson) => ({
    price: lesson.price === null ? null : lesson.price.toNumber(),
    paymentDate: lesson.paymentDate ?? lesson.startTime,
  }));

  return buildTaxBreakdown(lessonsForTax, periods, {
    start: range.gte,
    end: range.lte,
  });
};
