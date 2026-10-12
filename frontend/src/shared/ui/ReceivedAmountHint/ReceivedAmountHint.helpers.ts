import type { KeyboardEvent } from "react";

import { formatCurrency } from "../../lib";

const formatAmount = (amount: number): string => formatCurrency(amount, { withKopecks: true });

export const isReceivedAmountMismatch = (
  receivedAmount: number | null | undefined,
  price: number | null | undefined
): boolean =>
  receivedAmount !== null &&
  receivedAmount !== undefined &&
  Math.round(receivedAmount * 100) !== Math.round((price ?? 0) * 100);

export const formatReceivedMismatchTitle = (receivedAmount: number, price: number): string =>
  `Получено ${formatAmount(receivedAmount)}, стоимость урока ${formatAmount(price)}`;

export const formatReceivedShortLabel = (receivedAmount: number): string =>
  `получено ${formatAmount(receivedAmount)}`;

// Enter/Space on the hint must not activate the history row around it, and Space
// must not scroll the page; other keys (Escape for the lesson dialog) keep bubbling.
export const stopActivationKeyPropagation = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key === "Enter" || event.key === " ") event.stopPropagation();
  if (event.key === " ") event.preventDefault();
};
