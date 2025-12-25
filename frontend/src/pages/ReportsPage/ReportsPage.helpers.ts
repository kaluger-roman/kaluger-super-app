export const calculateCompletionRate = (completed: number, total: number): number => {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

export const calculateAveragePrice = (earnings: number, completed: number): number => {
  return completed > 0 ? earnings / completed : 0;
};
