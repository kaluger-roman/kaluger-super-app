import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { lessonsApi } from "@shared";

import {
  loadCompletedLessons,
  loadCompletedLessonsFx,
  loadLesson,
  loadUpcomingLessons,
  loadUpcomingLessonsFx,
  $lessonApiIsLoading,
} from "../api.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    lessonsApi: {
      getAll: vi.fn(),
      getById: vi.fn(),
      getUpcoming: vi.fn(),
      getByWeek: vi.fn(),
      getByDateRange: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("entities/lesson/models — $lessonApiIsLoading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set loading to false when effect completes", async () => {
    const scope = fork();

    vi.mocked(lessonsApi.getAll).mockResolvedValue({
      lessons: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    await allSettled(loadCompletedLessons, {
      scope,
      params: {},
    });

    expect(scope.getState($lessonApiIsLoading)).toBe(false);
  });

  it("should set loading to false when effect fails", async () => {
    const scope = fork();

    vi.mocked(lessonsApi.getById).mockRejectedValue(new Error("Not found"));

    await allSettled(loadLesson, {
      scope,
      params: "invalid-id",
    });

    expect(scope.getState($lessonApiIsLoading)).toBe(false);
  });

  it("should handle multiple concurrent effects", async () => {
    const scope = fork();

    vi.mocked(lessonsApi.getAll).mockResolvedValue({
      lessons: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    vi.mocked(lessonsApi.getUpcoming).mockResolvedValue({
      lessons: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    await Promise.all([
      allSettled(loadCompletedLessons, { scope, params: {} }),
      allSettled(loadUpcomingLessons, { scope, params: {} }),
    ]);

    expect(scope.getState($lessonApiIsLoading)).toBe(false);
  });

  it("should stay true while a slower effect is still in flight after a faster one finishes", async () => {
    let resolveSlow: (value: {
      lessons: never[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }) => void = () => undefined;
    const slowPromise = new Promise<{
      lessons: never[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>((resolve) => {
      resolveSlow = resolve;
    });

    vi.mocked(lessonsApi.getUpcoming).mockReturnValue(slowPromise);
    vi.mocked(lessonsApi.getAll).mockResolvedValue({
      lessons: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    const scope = fork();

    // Fire-and-forget the slow effect to leave it pending in the scope.
    // The combine-based loading store stays true until that effect resolves.
    void allSettled(loadUpcomingLessonsFx, { scope, params: {} });
    await new Promise((r) => setImmediate(r));

    void allSettled(loadCompletedLessonsFx, { scope, params: {} });
    await new Promise((r) => setImmediate(r));

    expect(scope.getState($lessonApiIsLoading)).toBe(true);

    resolveSlow({
      lessons: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  });
});
