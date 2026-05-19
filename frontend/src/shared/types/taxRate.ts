export type TaxRatePeriod = {
  id: string;
  startDate: string;
  rate: number;
};

export type CreateTaxRatePeriodDto = {
  startDate: string;
  rate: number;
};

export type TaxBreakdownEntry = {
  rate: number;
  earnings: number;
  tax: number;
  isOutsidePeriods?: boolean;
};
