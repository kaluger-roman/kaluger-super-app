import { allSettled, fork } from "effector";
import { describe, it, expect, vi } from "vitest";

import { lessonModel } from "@entities";

import * as filtersModel from "../lessons-filters.model";
import "../lessons-pagination-clamp.model";

type PageFilters = { page?: number };

const respondWith = (total: number, limit: number, totalPages: number) =>
  vi.fn((filters?: PageFilters) =>
    Promise.resolve({
      lessons: [],
      pagination: { total, page: filters?.page ?? 1, limit, totalPages },
    })
  );

describe("lessons-pagination-clamp.model", () => {
  it("should reload the last valid page when the requested page is now beyond totalPages", async () => {
    const loadUpcomingFn = respondWith(10, 10, 1);

    const scope = fork({
      handlers: [[lessonModel.loadUpcomingLessonsFx, loadUpcomingFn]],
      values: [[filtersModel.$onlyWithoutHomework, true]],
    });

    await allSettled(lessonModel.loadUpcomingLessonsFx, {
      scope,
      params: { page: 2, limit: 10, onlyUnpaid: false, onlyWithoutHomework: true },
    });

    expect(loadUpcomingFn).toHaveBeenCalledTimes(2);
    expect(loadUpcomingFn).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      onlyUnpaid: false,
      onlyWithoutHomework: true,
    });
  });

  it("should not reload when the requested page is within range", async () => {
    const loadUpcomingFn = respondWith(10, 10, 1);

    const scope = fork({
      handlers: [[lessonModel.loadUpcomingLessonsFx, loadUpcomingFn]],
    });

    await allSettled(lessonModel.loadUpcomingLessonsFx, {
      scope,
      params: { page: 1, limit: 10 },
    });

    expect(loadUpcomingFn).toHaveBeenCalledTimes(1);
  });

  it("should not reload (and not loop) when the result set is empty", async () => {
    const loadUpcomingFn = respondWith(0, 10, 0);

    const scope = fork({
      handlers: [[lessonModel.loadUpcomingLessonsFx, loadUpcomingFn]],
    });

    await allSettled(lessonModel.loadUpcomingLessonsFx, {
      scope,
      params: { page: 2, limit: 10 },
    });

    expect(loadUpcomingFn).toHaveBeenCalledTimes(1);
  });

  it("should clamp directly to the last page when several trailing pages become empty", async () => {
    const loadCompletedFn = respondWith(25, 10, 3);

    const scope = fork({
      handlers: [[lessonModel.loadCompletedLessonsFx, loadCompletedFn]],
    });

    await allSettled(lessonModel.loadCompletedLessonsFx, {
      scope,
      params: { page: 5, limit: 10 },
    });

    expect(loadCompletedFn).toHaveBeenCalledTimes(2);
    expect(loadCompletedFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));
  });
});
