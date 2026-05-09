import type { TaxBreakdownEntry } from "@shared";
import { formatCurrency } from "@shared";

export const formatBreakdownLine = (entry: TaxBreakdownEntry): string => {
  const base = `${entry.rate}% × ${formatCurrency(entry.earnings)} = ${formatCurrency(entry.tax)}`;
  return entry.isOutsidePeriods ? `${base} (вне настроенных периодов)` : base;
};
