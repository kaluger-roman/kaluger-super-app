import type { PaymentDatePreset } from "@features";

export const PAYMENT_DATE_PRESETS: { value: PaymentDatePreset; label: string }[] = [
  { value: "currentWeek", label: "Неделя" },
  { value: "currentMonth", label: "Месяц" },
  { value: "lastMonth", label: "Пр. месяц" },
];
