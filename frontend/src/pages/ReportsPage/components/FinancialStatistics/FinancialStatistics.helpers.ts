import type { TaxBreakdownEntry } from "@shared";

export const getTaxLabel = (breakdown: TaxBreakdownEntry[]): string => {
  if (breakdown.length === 1 && !breakdown[0].isOutsidePeriods) {
    return `Налоги (${breakdown[0].rate}%)`;
  }
  return "Налоги";
};

export const shouldShowTaxInfoIcon = (
  breakdown: TaxBreakdownEntry[],
): boolean =>
  breakdown.length > 1 || breakdown.some((entry) => entry.isOutsidePeriods);
