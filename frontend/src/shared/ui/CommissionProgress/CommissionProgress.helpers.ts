import { formatCurrency } from "../../lib";

export const formatCommissionMoney = (amount: number): string =>
  formatCurrency(amount, { withKopecks: true });

export const getCommissionRemaining = (amount: number, repaid: number): number =>
  Math.max(0, amount - repaid);

export const getCommissionPercent = (amount: number, repaid: number): number =>
  amount > 0 ? Math.min(100, Math.floor((repaid / amount) * 100)) : 0;

export const isCommissionClosed = (amount?: number | null, repaid?: number | null): boolean =>
  Boolean(amount && amount > 0 && getCommissionRemaining(amount, repaid ?? 0) === 0);
