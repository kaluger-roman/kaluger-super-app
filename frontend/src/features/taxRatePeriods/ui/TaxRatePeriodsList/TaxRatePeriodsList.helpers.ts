import type { TaxRatePeriod } from "@shared";

export type LabeledPeriod = {
  period: TaxRatePeriod;
  isCurrent: boolean;
  isFuture: boolean;
};

export const labelPeriods = (
  periods: TaxRatePeriod[],
  todayIso: string,
): LabeledPeriod[] => {
  const sorted = [...periods].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  let currentId: string | null = null;
  for (const p of sorted) {
    if (p.startDate.slice(0, 10) <= todayIso) currentId = p.id;
  }
  return sorted.map((period) => ({
    period,
    isCurrent: period.id === currentId,
    isFuture: period.startDate.slice(0, 10) > todayIso,
  }));
};
