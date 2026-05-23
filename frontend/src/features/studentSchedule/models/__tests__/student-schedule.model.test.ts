import { allSettled, fork } from "effector";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudentVisibleLesson } from "@shared";
import { studentCabinetApi } from "@shared";

import * as model from "../student-schedule.model";

vi.mock("@shared", async () => {
  const actual =
    await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    studentCabinetApi: {
      ...actual.studentCabinetApi,
      getLessonsByWeek: vi.fn(),
    },
  };
});

const makeLesson = (
  overrides: Partial<StudentVisibleLesson> = {}
): StudentVisibleLesson => ({
  id: "l-1",
  subject: "MATHEMATICS",
  startTime: "2026-05-04T10:00:00.000Z",
  endTime: "2026-05-04T11:00:00.000Z",
  status: "SCHEDULED",
  ...overrides,
});

describe("features/studentSchedule/models/student-schedule.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads lessons from API on weekChanged", async () => {
    vi.mocked(studentCabinetApi.getLessonsByWeek).mockResolvedValueOnce({
      weekStart: "2026-05-04",
      lessons: [makeLesson()],
    });

    const scope = fork();
    await allSettled(model.weekChanged, {
      scope,
      params: new Date("2026-05-04T00:00:00.000Z"),
    });

    expect(studentCabinetApi.getLessonsByWeek).toHaveBeenCalled();
    expect(scope.getState(model.$lessons)).toHaveLength(1);
    expect(scope.getState(model.$loadError)).toBeNull();
  });

  it("stores error when fetch fails", async () => {
    vi.mocked(studentCabinetApi.getLessonsByWeek).mockRejectedValueOnce(
      new Error("network")
    );

    const scope = fork();
    await allSettled(model.weekChanged, {
      scope,
      params: new Date("2026-05-04T00:00:00.000Z"),
    });

    expect(scope.getState(model.$loadError)).toMatch(/не удалось/i);
  });

  it("lessonCreated adds lesson when in current week", async () => {
    const scope = fork({
      values: [
        [model.$weekStart, new Date("2026-05-04T00:00:00.000Z")],
        [model.$lessons, []],
      ],
    });

    const newLesson = makeLesson({ id: "l-new" });
    await allSettled(model.lessonCreated, { scope, params: newLesson });

    expect(scope.getState(model.$lessons)).toEqual([newLesson]);
  });

  it("lessonCreated ignores lessons outside the visible week", async () => {
    const scope = fork({
      values: [
        [model.$weekStart, new Date("2026-05-04T00:00:00.000Z")],
        [model.$lessons, []],
      ],
    });

    const farFuture = makeLesson({
      id: "l-future",
      startTime: "2030-01-01T10:00:00.000Z",
      endTime: "2030-01-01T11:00:00.000Z",
    });
    await allSettled(model.lessonCreated, { scope, params: farFuture });

    expect(scope.getState(model.$lessons)).toEqual([]);
  });

  it("lessonCreated does not duplicate existing lesson by id", async () => {
    const existing = makeLesson();
    const scope = fork({
      values: [
        [model.$weekStart, new Date("2026-05-04T00:00:00.000Z")],
        [model.$lessons, [existing]],
      ],
    });

    await allSettled(model.lessonCreated, { scope, params: existing });

    expect(scope.getState(model.$lessons)).toEqual([existing]);
  });

  it("lessonUpdated replaces lesson when it stays in the week", async () => {
    const original = makeLesson();
    const scope = fork({
      values: [
        [model.$weekStart, new Date("2026-05-04T00:00:00.000Z")],
        [model.$lessons, [original]],
      ],
    });

    const updated = { ...original, status: "COMPLETED" as const };
    await allSettled(model.lessonUpdated, { scope, params: updated });

    const lessons = scope.getState(model.$lessons);
    expect(lessons).toHaveLength(1);
    expect(lessons[0].status).toBe("COMPLETED");
  });

  it("lessonUpdated removes lesson when it moves outside the visible week", async () => {
    const original = makeLesson();
    const scope = fork({
      values: [
        [model.$weekStart, new Date("2026-05-04T00:00:00.000Z")],
        [model.$lessons, [original]],
      ],
    });

    const moved = {
      ...original,
      startTime: "2030-01-01T10:00:00.000Z",
      endTime: "2030-01-01T11:00:00.000Z",
    };
    await allSettled(model.lessonUpdated, { scope, params: moved });

    expect(scope.getState(model.$lessons)).toEqual([]);
  });

  it("lessonDeleted removes the lesson", async () => {
    const scope = fork({
      values: [
        [model.$weekStart, new Date("2026-05-04T00:00:00.000Z")],
        [model.$lessons, [makeLesson({ id: "l-1" }), makeLesson({ id: "l-2" })]],
      ],
    });

    await allSettled(model.lessonDeleted, { scope, params: "l-1" });

    const lessons = scope.getState(model.$lessons);
    expect(lessons.map((l) => l.id)).toEqual(["l-2"]);
  });

  it("loads lessons on Gate.open without any week change", async () => {
    vi.mocked(studentCabinetApi.getLessonsByWeek).mockResolvedValueOnce({
      weekStart: "2026-05-04",
      lessons: [makeLesson({ id: "l-initial" })],
    });

    const scope = fork({
      values: [[model.$weekStart, new Date("2026-05-04T00:00:00.000Z")]],
    });
    await allSettled(model.StudentSchedulePageGate.open, {
      scope,
      params: undefined as unknown as void,
    });

    expect(studentCabinetApi.getLessonsByWeek).toHaveBeenCalledTimes(1);
    expect(scope.getState(model.$lessons)).toHaveLength(1);
  });

  it("lessonStatusUpdated mutates only the status field", async () => {
    const existing = makeLesson();
    const scope = fork({
      values: [
        [model.$weekStart, new Date("2026-05-04T00:00:00.000Z")],
        [model.$lessons, [existing]],
      ],
    });

    await allSettled(model.lessonStatusUpdated, {
      scope,
      params: { lessonId: existing.id, status: "CANCELLED" },
    });

    expect(scope.getState(model.$lessons)[0].status).toBe("CANCELLED");
  });
});
