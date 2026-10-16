import { TAX_EXEMPT_COLOR } from "@shared";

import type { SummaryTone } from "./IncomeHistorySummary.types";

export const SUMMARY_TONES: Record<SummaryTone, { color: string; background: string }> = {
  income: { color: "#00695c", background: "#e0f2f1" },
  tax: { color: "#e65100", background: "#fff3e0" },
  exempt: { color: TAX_EXEMPT_COLOR, background: "#f1f8f7" },
  commission: { color: "#6A1B9A", background: "#F3E5F5" },
};
