import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { taxRatePeriodModel } from "@entities";
import { taxPeriodsApi } from "@shared";

import {
  $isModalOpen,
  $draftPeriods,
  modalOpened,
  modalClosed,
  periodAdded,
  periodRateChanged,
  periodRemoved,
  periodStartDateChanged,
  saveRequested,
} from "../tax-rate-periods-modal.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    taxPeriodsApi: {
      list: vi.fn(),
      replaceAll: vi.fn(),
    },
  };
});

describe("tax-rate-periods-modal.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("snapshots current $periods into $draftPeriods on modalOpened", async () => {
    const initial = [
      { id: "p1", startDate: "2024-01-01", rate: 6 },
      { id: "p2", startDate: "2025-06-01", rate: 4 },
    ];
    const scope = fork({
      values: [[taxRatePeriodModel.$periods, initial]],
    });

    await allSettled(modalOpened, { scope, params: undefined });

    expect(scope.getState($isModalOpen)).toBe(true);
    const draft = scope.getState($draftPeriods);
    expect(draft).toHaveLength(2);
    expect(draft[0].rate).toBe(6);
    expect(draft[0].startDate).toBe("2024-01-01");
  });

  it("clears draft on modalClosed", async () => {
    const scope = fork({
      values: [
        [
          $draftPeriods,
          [{ tempId: "x", startDate: "2024-01-01", rate: 6 }],
        ],
      ],
    });
    await allSettled(modalClosed, { scope, params: undefined });
    expect(scope.getState($isModalOpen)).toBe(false);
    expect(scope.getState($draftPeriods)).toEqual([]);
  });

  it("adds, edits, and removes draft rows", async () => {
    const scope = fork();

    await allSettled(periodAdded, { scope, params: undefined });
    const draft = scope.getState($draftPeriods);
    expect(draft).toHaveLength(1);
    const tempId = draft[0].tempId;

    await allSettled(periodRateChanged, {
      scope,
      params: { tempId, rate: 13 },
    });
    expect(scope.getState($draftPeriods)[0].rate).toBe(13);

    await allSettled(periodStartDateChanged, {
      scope,
      params: { tempId, startDate: "2025-06-01" },
    });
    expect(scope.getState($draftPeriods)[0].startDate).toBe("2025-06-01");

    await allSettled(periodRemoved, { scope, params: { tempId } });
    expect(scope.getState($draftPeriods)).toEqual([]);
  });

  it("on save: sends the whole draft as a single replaceAll call", async () => {
    vi.mocked(taxPeriodsApi.replaceAll).mockResolvedValueOnce([
      { id: "p1", startDate: "2024-01-01", rate: 7 },
      { id: "new", startDate: "2026-01-01", rate: 13 },
    ]);

    const scope = fork({
      values: [
        [
          $draftPeriods,
          [
            { tempId: "t1", startDate: "2024-01-01", rate: 7 },
            { tempId: "t2", startDate: "2026-01-01", rate: 13 },
          ],
        ],
      ],
    });

    await allSettled(saveRequested, { scope, params: undefined });

    expect(taxPeriodsApi.replaceAll).toHaveBeenCalledTimes(1);
    expect(taxPeriodsApi.replaceAll).toHaveBeenCalledWith([
      { startDate: "2024-01-01", rate: 7 },
      { startDate: "2026-01-01", rate: 13 },
    ]);
    expect(scope.getState($isModalOpen)).toBe(false);
  });
});
