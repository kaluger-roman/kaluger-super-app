import { truncateToMinute } from "../../utils/time";

// Parse date-only strings as local day ranges (00:00 local to 23:59:59.999 local).
const parseLocalDateStart = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

const parseLocalDateEnd = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
};

export const getDateRange = (startDate?: string, endDate?: string) => {
  const now = new Date();

  const currentMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const currentMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const gte = startDate ? parseLocalDateStart(startDate) : currentMonthStart;
  const lte = endDate ? parseLocalDateEnd(endDate) : currentMonthEnd;

  return { gte, lte };
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
