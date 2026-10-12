import type { CommissionErrorReason } from "./studentForm.types";

export const COMMISSION_HELPER_TEXT =
  "Разовая сумма посреднику за этого ученика. Пусто = 0 ₽ — комиссии нет";

export const COMMISSION_ERROR_TEXTS: Record<CommissionErrorReason, string> = {
  negative: "Комиссия не может быть отрицательной",
  "not-a-number": "Комиссия должна быть числом",
  "too-large": "Комиссия не может превышать 99 999 999,99 ₽",
  "too-precise": "Комиссия не может содержать больше двух знаков после запятой",
};
