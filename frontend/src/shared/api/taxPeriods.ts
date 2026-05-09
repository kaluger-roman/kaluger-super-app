import { api } from "./base";
import type {
  TaxRatePeriod,
  CreateTaxRatePeriodDto,
  UpdateTaxRatePeriodDto,
} from "../types";

export const taxPeriodsApi = {
  list: async (): Promise<TaxRatePeriod[]> => {
    const response = await api.get("/tax-periods");
    return response.data;
  },

  create: async (data: CreateTaxRatePeriodDto): Promise<TaxRatePeriod> => {
    const response = await api.post("/tax-periods", data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateTaxRatePeriodDto,
  ): Promise<TaxRatePeriod> => {
    const response = await api.patch(`/tax-periods/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/tax-periods/${id}`);
  },
};
