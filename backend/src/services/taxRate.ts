import type { TaxBreakdownEntry, TaxRatePeriodDto } from "../types";

type LessonForTax = { price: number | null; paymentDate: Date | null };

type FilterRange = { start: Date; end: Date };

type RateInRange = { rate: number; isOutsidePeriods: boolean };

const sortPeriodsByStartAsc = (
  periods: TaxRatePeriodDto[],
): TaxRatePeriodDto[] =>
  [...periods].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

const bucketKey = (rate: number, isOutside: boolean): string =>
  `${rate}|${isOutside ? "out" : "in"}`;

const compareBucketEntries = (
  a: TaxBreakdownEntry,
  b: TaxBreakdownEntry,
): number => {
  if (a.rate !== b.rate) return a.rate - b.rate;
  // outside-of-periods entry comes before in-period entry of the same rate
  return Number(b.isOutsidePeriods ?? false) - Number(a.isOutsidePeriods ?? false);
};

export const resolveRate = (
  paymentDate: Date,
  periods: TaxRatePeriodDto[],
): number => {
  if (periods.length === 0) return 0;
  const sorted = sortPeriodsByStartAsc(periods);
  let applicable: TaxRatePeriodDto | null = null;
  for (const period of sorted) {
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

export const computeRatesInRange = (
  periods: TaxRatePeriodDto[],
  filterStart: Date,
  filterEnd: Date,
): RateInRange[] => {
  const sorted = sortPeriodsByStartAsc(periods);
  const result: RateInRange[] = [];
  const filterStartMs = filterStart.getTime();
  const filterEndMs = filterEnd.getTime();

  // 0%-zone before earliest period overlaps the filter
  if (
    sorted.length > 0 &&
    filterStartMs < new Date(sorted[0].startDate).getTime()
  ) {
    result.push({ rate: 0, isOutsidePeriods: true });
  }

  for (let i = 0; i < sorted.length; i++) {
    const periodStart = new Date(sorted[i].startDate).getTime();
    const periodEnd =
      i + 1 < sorted.length
        ? new Date(sorted[i + 1].startDate).getTime()
        : Number.POSITIVE_INFINITY;

    const overlapStart = Math.max(periodStart, filterStartMs);
    const overlapEnd = Math.min(periodEnd, filterEndMs);
    if (overlapStart < overlapEnd) {
      result.push({ rate: sorted[i].rate, isOutsidePeriods: false });
    }
  }

  return result;
};

export const buildTaxBreakdown = (
  lessons: LessonForTax[],
  periods: TaxRatePeriodDto[],
  filterRange: FilterRange,
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
    const key = bucketKey(rate, isOutside);
    const existing = buckets.get(key);
    if (existing) {
      existing.earnings += lesson.price;
      existing.tax += tax;
    } else {
      const entry: TaxBreakdownEntry = { rate, earnings: lesson.price, tax };
      if (isOutside) entry.isOutsidePeriods = true;
      buckets.set(key, entry);
    }
  }

  // Surface every applicable rate inside the filter, even when it had no
  // actual payments — this keeps the label/tooltip consistent with the
  // user-selected date range
  for (const { rate, isOutsidePeriods } of computeRatesInRange(
    periods,
    filterRange.start,
    filterRange.end,
  )) {
    const key = bucketKey(rate, isOutsidePeriods);
    if (buckets.has(key)) continue;
    const entry: TaxBreakdownEntry = { rate, earnings: 0, tax: 0 };
    if (isOutsidePeriods) entry.isOutsidePeriods = true;
    buckets.set(key, entry);
  }

  const taxBreakdown = [...buckets.values()].sort(compareBucketEntries);
  const taxAmount = taxBreakdown.reduce((sum, entry) => sum + entry.tax, 0);

  return { taxAmount, taxBreakdown };
};
