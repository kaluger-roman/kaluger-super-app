import { buildLessonFilterParams, buildPagedLessonParams } from "./lessons-filters.helpers";
import type { LessonFilterValues } from "./lessons-filters.types";

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

export const createPagedLessonParams = (filters: LessonFilterValues) =>
  buildPagedLessonParams(filters, 1, 10);

type WeeklyParams = LessonFilterValues & { currentWeek: Date };

export const createWeeklyLessonParams = ({ currentWeek, ...filters }: WeeklyParams) => ({
  weekStart: currentWeek.toISOString(),
  ...buildLessonFilterParams(filters),
});
