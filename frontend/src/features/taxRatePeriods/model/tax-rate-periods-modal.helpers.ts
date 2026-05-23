import type { CreateTaxRatePeriodDto, TaxRatePeriod } from "@shared";

import type { DraftPeriod } from "./tax-rate-periods-modal.types";

export const generateTempId = (): string =>
  `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const sortDraftByDate = (a: DraftPeriod, b: DraftPeriod): number =>
  a.startDate.localeCompare(b.startDate);

export const periodsToDraft = (periods: TaxRatePeriod[]): DraftPeriod[] =>
  periods.map((p) => ({
    tempId: generateTempId(),
    startDate: p.startDate.slice(0, 10),
    rate: p.rate,
  }));

export const draftToCreatePayload = (
  draft: DraftPeriod[],
): CreateTaxRatePeriodDto[] =>
  draft.map((d) => ({ startDate: d.startDate, rate: d.rate }));

export const addDraftPeriod = (draft: DraftPeriod[]): DraftPeriod[] =>
  [
    ...draft,
    { tempId: generateTempId(), startDate: todayIso(), rate: 6 },
  ].sort(sortDraftByDate);

export const updateDraftStartDate = (
  draft: DraftPeriod[],
  payload: { tempId: string; startDate: string },
): DraftPeriod[] =>
  draft
    .map((p) =>
      p.tempId === payload.tempId
        ? { ...p, startDate: payload.startDate }
        : p,
    )
    .sort(sortDraftByDate);

export const updateDraftRate = (
  draft: DraftPeriod[],
  payload: { tempId: string; rate: number },
): DraftPeriod[] =>
  draft.map((p) =>
    p.tempId === payload.tempId ? { ...p, rate: payload.rate } : p,
  );

export const removeDraftPeriod = (
  draft: DraftPeriod[],
  payload: { tempId: string },
): DraftPeriod[] => draft.filter((p) => p.tempId !== payload.tempId);

