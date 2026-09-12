import { buildPagedLessonParams } from "./lessonsFilters.helpers";
import type { LessonFilterValues } from "./lessonsFilters.types";

type LessonsPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// totalPages >= 1 guard: an empty result set has totalPages 0, and page is always
// >= 1, so without it a re-fetch would loop forever instead of showing the empty state.
export const isPageBeyondLastPage = (pagination: LessonsPagination): boolean =>
  pagination.totalPages >= 1 && pagination.page > pagination.totalPages;

export const createLastPageParams = (filters: LessonFilterValues, pagination: LessonsPagination) =>
  buildPagedLessonParams(filters, pagination.totalPages, pagination.limit);
