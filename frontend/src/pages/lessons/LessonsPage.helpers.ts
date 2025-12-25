export const getScheduleDateRangeParams = () => {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 15);
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + 15);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    noPagination: "true" as const,
  };
};
