import { formatDateLong, formatWeekRange } from "@shared";

import type { ReportsPeriod } from "../../model";

export const formatPaymentsCount = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} оплата`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} оплаты`;
  return `${count} оплат`;
};

// formatWeekRange prints the year only once, at the end of the range.
export const formatAppliedPeriod = (range: ReportsPeriod | null): string => {
  if (!range) return "";
  const isSameYear =
    new Date(range.startDate).getFullYear() === new Date(range.endDate).getFullYear();
  return isSameYear
    ? formatWeekRange(range.startDate, range.endDate)
    : `${formatDateLong(range.startDate)} — ${formatDateLong(range.endDate)}`;
};
