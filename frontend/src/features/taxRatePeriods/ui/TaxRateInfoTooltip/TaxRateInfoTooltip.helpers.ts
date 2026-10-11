import type { TaxBreakdownEntry } from "@shared";
import { formatCurrency, TAX_EXEMPT_LABEL } from "@shared";

export const formatBreakdownLine = (entry: TaxBreakdownEntry): string => {
  const base = `${entry.rate}% × ${formatCurrency(entry.earnings)} = ${formatCurrency(entry.tax)}`;
  return entry.isOutsidePeriods ? `${base} (вне настроенных периодов)` : base;
};

export const formatTaxExemptLine = (amount: number): string =>
  `${TAX_EXEMPT_LABEL}: ${formatCurrency(amount)}`;
