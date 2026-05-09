import { api } from "./base";
import type { CreateTaxRatePeriodDto, TaxRatePeriod } from "../types";

export const taxPeriodsApi = {
  list: async (): Promise<TaxRatePeriod[]> => {
    const response = await api.get("/tax-periods");
    return response.data;
  },

  replaceAll: async (
    periods: CreateTaxRatePeriodDto[],
  ): Promise<TaxRatePeriod[]> => {
    const response = await api.put("/tax-periods", { periods });
    return response.data;
  },
};
