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

type LoadParams = {
  onlyUnpaid: boolean;
  onlyWithoutHomework: boolean;
  paymentDateFrom: Date | null;
  paymentDateTo: Date | null;
};

export const createPagedLessonParams = ({
  onlyUnpaid,
  onlyWithoutHomework,
  paymentDateFrom,
  paymentDateTo,
}: LoadParams) => ({
  page: 1,
  limit: 10,
  onlyUnpaid,
  onlyWithoutHomework,
  ...(paymentDateFrom && { paymentDateFrom: paymentDateFrom.toISOString() }),
  ...(paymentDateTo && { paymentDateTo: paymentDateTo.toISOString() }),
});

type WeeklyParams = {
  currentWeek: Date;
  onlyUnpaid: boolean;
  onlyWithoutHomework: boolean;
  paymentDateFrom: Date | null;
  paymentDateTo: Date | null;
};

export const createWeeklyLessonParams = ({
  currentWeek,
  onlyUnpaid,
  onlyWithoutHomework,
  paymentDateFrom,
  paymentDateTo,
}: WeeklyParams) => ({
  weekStart: currentWeek.toISOString(),
  onlyUnpaid,
  onlyWithoutHomework,
  ...(paymentDateFrom && { paymentDateFrom: paymentDateFrom.toISOString() }),
  ...(paymentDateTo && { paymentDateTo: paymentDateTo.toISOString() }),
});
