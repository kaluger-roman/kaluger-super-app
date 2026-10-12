export const MAX_RECEIVED_AMOUNT = 99_999_999.99;

export const RECEIVED_AMOUNT_ERRORS = {
  REQUIRED: "Укажите полученную сумму",
  INVALID: "Сумма должна быть неотрицательным числом",
  TOO_MANY_DECIMALS: "Не больше двух знаков после запятой",
  TOO_LARGE: "Сумма не может превышать 99 999 999,99 ₽",
} as const;
