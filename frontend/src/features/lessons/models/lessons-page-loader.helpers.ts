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
};

export const createPagedLessonParams = ({ onlyUnpaid, onlyWithoutHomework }: LoadParams) => ({
  page: 1,
  limit: 10,
  onlyUnpaid,
  onlyWithoutHomework,
});

type WeeklyParams = {
  currentWeek: Date;
  onlyUnpaid: boolean;
  onlyWithoutHomework: boolean;
};

export const createWeeklyLessonParams = ({
  currentWeek,
  onlyUnpaid,
  onlyWithoutHomework,
}: WeeklyParams) => ({
  weekStart: currentWeek.toISOString(),
  onlyUnpaid,
  onlyWithoutHomework,
});
