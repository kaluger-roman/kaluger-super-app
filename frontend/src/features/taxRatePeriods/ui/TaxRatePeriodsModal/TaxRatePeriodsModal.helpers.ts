import type { DraftPeriod } from "../../model/tax-rate-periods-modal.types";

export type PeriodFlags = { isCurrent: boolean; isFuture: boolean };

export const computePeriodFlags = (
  draft: DraftPeriod[],
  todayIso: string,
): Map<string, PeriodFlags> => {
  const map = new Map<string, PeriodFlags>();
  const sorted = [...draft].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  let currentTempId: string | null = null;
  for (const p of sorted) {
    if (p.startDate <= todayIso) currentTempId = p.tempId;
  }
  for (const p of sorted) {
    map.set(p.tempId, {
      isCurrent: p.tempId === currentTempId,
      isFuture: p.startDate > todayIso,
    });
  }
  return map;
};
