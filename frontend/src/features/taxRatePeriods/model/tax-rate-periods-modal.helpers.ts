import type { TaxRatePeriod } from "@shared";

import type { DraftPeriod, SaveDiff, SavePayload } from "./tax-rate-periods-modal.types";

export const generateTempId = (): string =>
  `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const sortDraftByDate = (a: DraftPeriod, b: DraftPeriod): number =>
  a.startDate.localeCompare(b.startDate);

export const periodsToDraft = (periods: TaxRatePeriod[]): DraftPeriod[] =>
  periods.map((p) => ({
    tempId: generateTempId(),
    originalId: p.id,
    startDate: p.startDate.slice(0, 10),
    rate: p.rate,
  }));

export const computeDiff = ({ initial, draft }: SavePayload): SaveDiff => {
  const toCreate: DraftPeriod[] = [];
  const toUpdate: SaveDiff["toUpdate"] = [];
  const toDelete: string[] = [];
  const draftOriginalIds = new Set(
    draft.map((d) => d.originalId).filter((id): id is string => Boolean(id)),
  );

  for (const d of draft) {
    if (!d.originalId) {
      toCreate.push(d);
      continue;
    }
    const original = initial.find((p) => p.id === d.originalId);
    if (!original) continue;
    const changes: { startDate?: string; rate?: number } = {};
    if (original.startDate !== d.startDate) changes.startDate = d.startDate;
    if (original.rate !== d.rate) changes.rate = d.rate;
    if (Object.keys(changes).length > 0) {
      toUpdate.push({ id: d.originalId, data: changes });
    }
  }

  for (const original of initial) {
    if (!draftOriginalIds.has(original.id)) {
      toDelete.push(original.id);
    }
  }

  return { toCreate, toUpdate, toDelete };
};

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

export const extractErrorMessage = (error: unknown): string => {
  type AxiosLike = {
    response?: { data?: { error?: string } };
    message?: string;
  };
  const e = error as AxiosLike;
  return (
    e.response?.data?.error || e.message || "Не удалось сохранить периоды"
  );
};
