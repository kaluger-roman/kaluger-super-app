import { getCurrentMonthRange, getLastMonthBounds } from "../../utils/time";

export const getDateRange = (
  startDate?: string,
  endDate?: string,
  timezone?: string
) => {
  const fallback = getCurrentMonthRange(timezone);

  const gte = startDate ? new Date(startDate) : fallback.gte;
  const lte = endDate ? new Date(endDate) : fallback.lte;

  return { gte, lte };
};

export const getLastMonthRange = (timezone?: string) => {
  return getLastMonthBounds(timezone);
};

export const buildStatisticsWhere = (
  userId: string,
  startDate?: string,
  endDate?: string,
  timezone?: string
) => {
  return {
    tutorId: userId,
    startTime: getDateRange(startDate, endDate, timezone),
  };
};
