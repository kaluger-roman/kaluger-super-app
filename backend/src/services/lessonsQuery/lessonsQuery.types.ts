export type LessonsQueryParams = {
  startDate?: string;
  endDate?: string;
  studentId?: string;
  status?: string;
  upcoming?: string;
  currentTime?: string;
  page?: string;
  limit?: string;
  weekly?: string;
  noPagination?: string;
  weekStart?: string;
  onlyUnpaid?: string;
  onlyWithoutHomework?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
};

export type LessonsPagination = {
  page: number;
  limit: number;
  skip: number;
};

export type LessonsPageOptions = {
  orderAsc: boolean;
  pagination: LessonsPagination | null;
  withPaymentsSummary: boolean;
};

export type PaymentsSummary = {
  sum: number;
  count: number;
};
