import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { lessonsApi } from "@shared";

import { loadCompletedLessons, loadLesson, loadUpcomingLessons, $isLoading } from "../api.model";

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

describe("entities/lesson/models/loading.model", () => {
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

    expect(scope.getState($isLoading)).toBe(false);
  });

  it("should set loading to false when effect fails", async () => {
    const scope = fork();

    vi.mocked(lessonsApi.getById).mockRejectedValue(new Error("Not found"));

    await allSettled(loadLesson, {
      scope,
      params: "invalid-id",
    });

    expect(scope.getState($isLoading)).toBe(false);
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

    expect(scope.getState($isLoading)).toBe(false);
  });
});
