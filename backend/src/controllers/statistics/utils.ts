import { truncateToMinute } from "../../utils/time";

export const getDateRange = (startDate?: string, endDate?: string) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const lte = endDate
    ? (() => {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        return d;
      })()
    : currentMonthEnd;

  return {
    gte: startDate ? new Date(startDate) : currentMonthStart,
    lte,
  };
};

export const getLastMonthRange = () => {
  const now = truncateToMinute(new Date());
  const lastMonthStart = truncateToMinute(
    new Date(now.getFullYear(), now.getMonth() - 1, 1)
  );
  const lastMonthEnd = truncateToMinute(
    new Date(now.getFullYear(), now.getMonth(), 0)
  );

  return {
    gte: lastMonthStart,
    lte: lastMonthEnd,
  };
};

export const buildStatisticsWhere = (
  userId: string,
  startDate?: string,
  endDate?: string
) => {
  return {
    tutorId: userId,
    startTime: getDateRange(startDate, endDate),
  };
};
