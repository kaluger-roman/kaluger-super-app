import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { taxPeriodsApi } from "@shared";

import {
  $periods,
  loadPeriodsFx,
  periodsRequested,
  periodsSet,
} from "../tax-rate-period.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    taxPeriodsApi: {
      list: vi.fn(),
    },
  };
});

describe("tax-rate-period.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads periods on periodsRequested", async () => {
    const items = [
      { id: "p1", startDate: "2024-01-01", rate: 6 },
      { id: "p2", startDate: "2025-06-01", rate: 4 },
    ];
    vi.mocked(taxPeriodsApi.list).mockResolvedValueOnce(items);

    const scope = fork();
    await allSettled(periodsRequested, { scope, params: undefined });

    expect(taxPeriodsApi.list).toHaveBeenCalled();
    expect(scope.getState($periods)).toEqual(items);
  });

  it("updates $periods on periodsSet", async () => {
    const items = [{ id: "p1", startDate: "2024-01-01", rate: 7 }];
    const scope = fork();
    await allSettled(periodsSet, { scope, params: items });
    expect(scope.getState($periods)).toEqual(items);
  });

  it("populates $periods from loadPeriodsFx done", async () => {
    const items = [{ id: "p1", startDate: "2024-01-01", rate: 6 }];
    vi.mocked(taxPeriodsApi.list).mockResolvedValueOnce(items);
    const scope = fork();
    await allSettled(loadPeriodsFx, { scope, params: undefined });
    expect(scope.getState($periods)).toEqual(items);
  });
});
