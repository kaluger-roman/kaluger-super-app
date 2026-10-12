import { MAX_RECEIVED_AMOUNT, RECEIVED_AMOUNT_ERRORS } from "./receivedAmount.constants";

const normalizeReceivedAmount = (value: string) => value.trim().replace(",", ".");

export const toReceivedAmountInput = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? "" : String(amount);

export const parseReceivedAmount = (value: string): number =>
  Number(normalizeReceivedAmount(value));

export const validateReceivedAmount = (value: string): string | null => {
  const normalized = normalizeReceivedAmount(value);
  if (!normalized) return RECEIVED_AMOUNT_ERRORS.REQUIRED;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return RECEIVED_AMOUNT_ERRORS.INVALID;
  if (amount > MAX_RECEIVED_AMOUNT) return RECEIVED_AMOUNT_ERRORS.TOO_LARGE;
  if (Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6) {
    return RECEIVED_AMOUNT_ERRORS.TOO_MANY_DECIMALS;
  }
  return null;
};
