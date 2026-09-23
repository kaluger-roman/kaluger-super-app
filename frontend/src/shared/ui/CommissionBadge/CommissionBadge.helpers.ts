import {
  COMMISSION_BADGE_LABELS,
  COMMISSION_BADGE_SHORT_LABELS,
} from "./CommissionBadge.constants";
import { formatCurrency } from "../../lib";
import type { CommissionCredit } from "../../types";

const formatAmount = (amount: number): string => formatCurrency(amount, { withKopecks: true });

// The tilde marks a forecast as "not written off yet" without relying on colour.
const formatCommissionAmount = (credit: CommissionCredit): string =>
  credit.state === "FORECAST" ? `~${formatAmount(credit.amount)}` : formatAmount(credit.amount);

export const formatCommissionInlineText = (credit: CommissionCredit): string =>
  `(${formatCommissionAmount(credit)})`;

export const formatCommissionFullText = (credit: CommissionCredit): string =>
  `${COMMISSION_BADGE_SHORT_LABELS[credit.state]}: ${formatCommissionAmount(credit)}`;

export const formatCommissionAriaLabel = (credit: CommissionCredit): string =>
  `${COMMISSION_BADGE_LABELS[credit.state]}: ${formatAmount(credit.amount)}`;
