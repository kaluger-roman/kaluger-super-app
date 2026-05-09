import type { TaxRatePeriod } from "@shared";

export type DraftPeriod = {
  tempId: string;
  originalId?: string;
  startDate: string;
  rate: number;
};

export type SavePayload = {
  initial: TaxRatePeriod[];
  draft: DraftPeriod[];
};

export type SaveDiff = {
  toCreate: DraftPeriod[];
  toUpdate: { id: string; data: { startDate?: string; rate?: number } }[];
  toDelete: string[];
};
