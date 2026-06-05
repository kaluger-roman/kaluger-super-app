export type PaymentDatePreset = "currentMonth" | "lastMonth" | "currentWeek";

export type LessonFilterValues = {
  onlyUnpaid: boolean;
  onlyWithoutHomework: boolean;
  paymentDateFrom: Date | null;
  paymentDateTo: Date | null;
};
