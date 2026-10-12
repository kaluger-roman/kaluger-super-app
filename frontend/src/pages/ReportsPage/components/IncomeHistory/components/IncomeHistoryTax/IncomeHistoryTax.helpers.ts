import { formatCurrency } from "@shared";
import type { IncomeHistoryTax } from "@shared";

export const formatEntryTax = (tax: Exclude<IncomeHistoryTax, { kind: "EXEMPT" }>): string =>
  tax.kind === "OUTSIDE_PERIODS"
    ? `налог ${formatCurrency(0)} · вне настроенных периодов`
    : `налог ${formatCurrency(tax.amount)} · ${tax.rate}%`;
