import { allSettled, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { lessonsApi, statisticsApi } from "@shared";
import type { Lesson } from "@shared";

import { PERIOD, makeHistory } from "./incomeHistory.fixtures";
import * as incomeHistoryModel from "../incomeHistory.model";
import * as incomeHistoryReloadModel from "../incomeHistoryReload.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    statisticsApi: { ...actual.statisticsApi, getIncomeHistory: vi.fn() },
    lessonsApi: { ...actual.lessonsApi, getById: vi.fn() },
  };
});

const HISTORY = makeHistory(["2026-09-25", "2026-09-20"]);

describe("incomeHistory effects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(statisticsApi.getIncomeHistory).mockResolvedValue({ data: HISTORY } as Awaited<
      ReturnType<typeof statisticsApi.getIncomeHistory>
    >);
  });

  it("should request the first page down to the given day without the version", async () => {
    const scope = fork();

    const { status, value } = await allSettled(incomeHistoryModel.loadIncomeHistoryFx, {
      scope,
      params: { ...PERIOD, through: "2026-09-20", version: 3 },
    });

    expect(status).toBe("done");
    expect(value).toEqual(HISTORY);
    expect(statisticsApi.getIncomeHistory).toHaveBeenCalledWith({
      ...PERIOD,
      through: "2026-09-20",
    });
  });

  it("should request the next page before the cursor without the version", async () => {
    const scope = fork();

    const { status, value } = await allSettled(incomeHistoryModel.loadNextPageFx, {
      scope,
      params: { ...PERIOD, before: "2026-09-20", version: 3 },
    });

    expect(status).toBe("done");
    expect(value).toEqual(HISTORY);
    expect(statisticsApi.getIncomeHistory).toHaveBeenCalledWith({
      ...PERIOD,
      before: "2026-09-20",
    });
  });

  it("should load the lesson to open by its id", async () => {
    const lesson = { id: "lesson-1" } as Lesson;
    vi.mocked(lessonsApi.getById).mockResolvedValue(lesson);
    const scope = fork();

    const { status, value } = await allSettled(incomeHistoryReloadModel.openLessonFx, {
      scope,
      params: "lesson-1",
    });

    expect(status).toBe("done");
    expect(value).toBe(lesson);
    expect(lessonsApi.getById).toHaveBeenCalledWith("lesson-1");
  });
});
