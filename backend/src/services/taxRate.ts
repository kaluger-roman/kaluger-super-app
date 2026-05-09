import type { TaxBreakdownEntry, TaxRatePeriodDto } from "../types";

type LessonForTax = { price: number | null; paymentDate: Date | null };

export const resolveRate = (
  paymentDate: Date,
  periods: TaxRatePeriodDto[],
): number => {
  if (periods.length === 0) return 0;
  let applicable: TaxRatePeriodDto | null = null;
  for (const period of periods) {
    const periodStart = new Date(period.startDate).getTime();
    if (periodStart <= paymentDate.getTime()) {
      applicable = period;
    } else {
      break;
    }
  }
  return applicable ? applicable.rate : 0;
};

export const calcLessonTax = (price: number, rate: number): number =>
  Math.round((price * rate) / 100);

const sortPeriodsByStartAsc = (
  periods: TaxRatePeriodDto[],
): TaxRatePeriodDto[] =>
  [...periods].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

export const buildTaxBreakdown = (
  lessons: LessonForTax[],
  periods: TaxRatePeriodDto[],
): { taxAmount: number; taxBreakdown: TaxBreakdownEntry[] } => {
  const sortedPeriods = sortPeriodsByStartAsc(periods);
  const earliestStart =
    sortedPeriods.length > 0
      ? new Date(sortedPeriods[0].startDate).getTime()
      : Number.POSITIVE_INFINITY;

  const buckets = new Map<string, TaxBreakdownEntry>();

  for (const lesson of lessons) {
    if (lesson.price == null || lesson.paymentDate == null) continue;
    const paymentTime = lesson.paymentDate.getTime();
    const isOutside = paymentTime < earliestStart;
    const rate = isOutside ? 0 : resolveRate(lesson.paymentDate, sortedPeriods);
    const tax = calcLessonTax(lesson.price, rate);
    const key = `${rate}|${isOutside ? "out" : "in"}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.earnings += lesson.price;
      existing.tax += tax;
    } else {
      const entry: TaxBreakdownEntry = {
        rate,
        earnings: lesson.price,
        tax,
      };
      if (isOutside) entry.isOutsidePeriods = true;
      buckets.set(key, entry);
    }
  }

  const taxBreakdown = [...buckets.values()].sort((a, b) => a.rate - b.rate);
  const taxAmount = taxBreakdown.reduce((sum, entry) => sum + entry.tax, 0);

  return { taxAmount, taxBreakdown };
};
