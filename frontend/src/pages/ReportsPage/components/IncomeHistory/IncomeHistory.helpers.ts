import { formatDateLong, formatWeekRange, pluralize } from "@shared";

import { PAYMENTS_FORMS } from "./IncomeHistory.constants";
import type { ReportsPeriod } from "../../model";

export const formatPaymentsCount = (count: number): string => pluralize(count, PAYMENTS_FORMS);

// formatWeekRange prints the year only once, at the end of the range.
export const formatAppliedPeriod = (range: ReportsPeriod | null): string => {
  if (!range) return "";
  const isSameYear =
    new Date(range.startDate).getFullYear() === new Date(range.endDate).getFullYear();
  return isSameYear
    ? formatWeekRange(range.startDate, range.endDate)
    : `${formatDateLong(range.startDate)} — ${formatDateLong(range.endDate)}`;
};
