import { toLocalEndOfDay, toLocalStartOfDay } from "./lessons-filters.helpers";

type LessonsPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ClampFilters = {
  onlyUnpaid: boolean;
  onlyWithoutHomework: boolean;
  paymentDateFrom: Date | null;
  paymentDateTo: Date | null;
};

// totalPages >= 1 guard: an empty result set has totalPages 0, and page is always
// >= 1, so without it a re-fetch would loop forever instead of showing the empty state.
export const isPageBeyondLastPage = (pagination: LessonsPagination): boolean =>
  pagination.totalPages >= 1 && pagination.page > pagination.totalPages;

export const createLastPageParams = (
  { onlyUnpaid, onlyWithoutHomework, paymentDateFrom, paymentDateTo }: ClampFilters,
  pagination: LessonsPagination
) => ({
  page: pagination.totalPages,
  limit: pagination.limit,
  onlyUnpaid,
  onlyWithoutHomework,
  ...(paymentDateFrom && { paymentDateFrom: toLocalStartOfDay(paymentDateFrom) }),
  ...(paymentDateTo && { paymentDateTo: toLocalEndOfDay(paymentDateTo) }),
});
