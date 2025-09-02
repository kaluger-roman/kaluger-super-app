export const getDateRange = (startDate?: string, endDate?: string) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    gte: startDate ? new Date(startDate) : currentMonthStart,
    lte: endDate ? new Date(endDate) : currentMonthEnd,
  };
};

export const getLastMonthRange = () => {
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

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
