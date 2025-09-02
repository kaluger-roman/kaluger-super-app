export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const calculateEarningsChange = (
  earnings: number,
  lastMonthEarnings: number
) => {
  const change = earnings - lastMonthEarnings;
  const changePercent =
    lastMonthEarnings > 0
      ? ((change / lastMonthEarnings) * 100).toFixed(1)
      : "0";

  return { change, changePercent };
};

export const calculateCompletionRate = (
  completed: number,
  total: number
): number => {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

export const calculateAveragePrice = (
  earnings: number,
  completed: number
): number => {
  return completed > 0 ? earnings / completed : 0;
};
