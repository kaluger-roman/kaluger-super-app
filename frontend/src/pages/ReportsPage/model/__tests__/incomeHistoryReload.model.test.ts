import { allSettled, createWatch, fork } from "effector";
import { describe, it, expect, vi } from "vitest";

import { lessonModel, studentModel } from "@entities";
import { lessonsModel } from "@features";
import { notificationsModel } from "@shared";
import type { IncomeHistory, Lesson } from "@shared";

import { PERIOD, makeHistory } from "./incomeHistory.fixtures";
import * as incomeHistoryModel from "../incomeHistory.model";
import * as incomeHistoryReloadModel from "../incomeHistoryReload.model";
import * as statisticsModel from "../statistics.model";

const LESSON: Lesson = {
  id: "lesson-1",
  subject: "MATHEMATICS",
  lessonType: "EGE",
  startTime: "2026-09-15T10:00:00.000Z",
  endTime: "2026-09-15T11:30:00.000Z",
  price: 2000,
  isPaid: true,
  paymentDate: "2026-09-15T00:00:00.000Z",
  receivedAmount: 2000,
  status: "COMPLETED",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  studentId: "student-1",
};

const HISTORY = makeHistory(["2026-09-25", "2026-09-20"], {
  nextCursor: "2026-09-20",
  remainingCount: 3,
});

const EMPTY_LIST = {
  lessons: [],
  pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
};

const httpError = (status: number, error?: string) =>
  Object.assign(new Error("Request failed"), {
    response: { status, data: error ? { error } : {} },
  });

const createScope = async ({
  history = HISTORY,
  isPageOpen = true,
  openLesson = vi.fn().mockResolvedValue(LESSON),
  updateLesson = vi.fn().mockResolvedValue(LESSON),
}: {
  history?: IncomeHistory | null;
  isPageOpen?: boolean;
  openLesson?: ReturnType<typeof vi.fn>;
  updateLesson?: ReturnType<typeof vi.fn>;
} = {}) => {
  const loadStatistics = vi.fn().mockResolvedValue(null);
  const loadHistory = vi.fn().mockResolvedValue(history);
  const showError = vi.fn();
  const scope = fork({
    handlers: [
      [incomeHistoryReloadModel.openLessonFx, openLesson],
      [statisticsModel.loadStatisticsFx, loadStatistics],
      [incomeHistoryModel.loadIncomeHistoryFx, loadHistory],
      [lessonModel.updateLessonFx, updateLesson],
      [lessonModel.syncLessonFx, vi.fn().mockResolvedValue(LESSON)],
      [lessonModel.removeLessonFx, vi.fn().mockResolvedValue(LESSON.id)],
      [lessonModel.loadCompletedLessonsFx, vi.fn().mockResolvedValue(EMPTY_LIST)],
      [lessonModel.loadCancelledLessonsFx, vi.fn().mockResolvedValue(EMPTY_LIST)],
      [lessonModel.loadAllLessonsFx, vi.fn().mockResolvedValue(EMPTY_LIST)],
      [lessonModel.loadUpcomingLessonsFx, vi.fn().mockResolvedValue(EMPTY_LIST)],
      [lessonModel.loadWeeklyLessonsFx, vi.fn().mockResolvedValue(EMPTY_LIST)],
      [lessonModel.loadScheduleLessonsFx, vi.fn().mockResolvedValue(EMPTY_LIST)],
      [
        studentModel.refreshStudentsSilentlyFx,
        vi.fn().mockResolvedValue({ active: [], archived: [], generation: 0 }),
      ],
    ],
  });
  createWatch({ unit: notificationsModel.showErrorEvent, fn: showError, scope });

  if (isPageOpen) {
    await allSettled(statisticsModel.ReportsPageGate.open, { scope, params: {} });
  }
  await allSettled(statisticsModel.$appliedRange, { scope, params: PERIOD });
  await allSettled(incomeHistoryModel.$incomeHistory, { scope, params: history });
  await allSettled(incomeHistoryModel.$historyRange, { scope, params: history ? PERIOD : null });
  loadStatistics.mockClear();
  loadHistory.mockClear();

  return { scope, openLesson, loadStatistics, loadHistory, showError };
};

describe("incomeHistoryReload.model opening a lesson", () => {
  it("should load the lesson and show it in the popup", async () => {
    const { scope, openLesson } = await createScope();

    await allSettled(incomeHistoryReloadModel.incomeHistoryLessonOpened, {
      scope,
      params: LESSON.id,
    });

    expect(openLesson).toHaveBeenCalledWith(LESSON.id);
    expect(scope.getState(lessonsModel.$viewingLesson)).toEqual(LESSON);
    expect(scope.getState(lessonsModel.$isViewDialogOpen)).toBe(true);
  });

  it("should report a deleted lesson and reload the cards and the history", async () => {
    const { scope, loadStatistics, loadHistory, showError } = await createScope({
      openLesson: vi.fn().mockRejectedValue(httpError(404, "Урок не найден")),
    });

    await allSettled(incomeHistoryReloadModel.incomeHistoryLessonOpened, {
      scope,
      params: LESSON.id,
    });

    expect(showError).toHaveBeenCalledWith(
      "Урок не найден: возможно, он удалён. История поступлений обновлена"
    );
    expect(loadStatistics).toHaveBeenCalledWith(PERIOD);
    expect(loadHistory).toHaveBeenCalledWith(
      expect.objectContaining({ ...PERIOD, through: "2026-09-20" })
    );
    expect(scope.getState(lessonsModel.$isViewDialogOpen)).toBe(false);
  });

  it.each([
    [httpError(500, "Внутренняя ошибка сервера"), "Внутренняя ошибка сервера"],
    [new Error("Network Error"), "Не удалось открыть урок"],
  ])("should show the error of a failed lesson request without a reload", async (error, text) => {
    const { scope, loadStatistics, loadHistory, showError } = await createScope({
      openLesson: vi.fn().mockRejectedValue(error),
    });

    await allSettled(incomeHistoryReloadModel.incomeHistoryLessonOpened, {
      scope,
      params: LESSON.id,
    });

    expect(showError).toHaveBeenCalledWith(text);
    expect(loadStatistics).not.toHaveBeenCalled();
    expect(loadHistory).not.toHaveBeenCalled();
  });
});

describe("incomeHistoryReload.model after a lesson change", () => {
  it("should reload the cards and the history down to the last loaded day after an update", async () => {
    const { scope, loadStatistics, loadHistory } = await createScope();

    await allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: LESSON.id, data: { isPaid: false } },
    });

    expect(loadStatistics).toHaveBeenCalledWith(PERIOD);
    expect(loadHistory).toHaveBeenCalledTimes(1);
    expect(loadHistory).toHaveBeenCalledWith({ ...PERIOD, through: "2026-09-20", version: 2 });
  });

  it("should reload the cards and the history after a deletion", async () => {
    const { scope, loadStatistics, loadHistory } = await createScope();

    await allSettled(lessonModel.removeLessonFx, { scope, params: { id: LESSON.id } });

    expect(loadStatistics).toHaveBeenCalledWith(PERIOD);
    expect(loadHistory).toHaveBeenCalledWith(
      expect.objectContaining({ ...PERIOD, through: "2026-09-20" })
    );
  });

  it.each([
    ["without a loaded history", null],
    ["with an empty history", makeHistory([])],
  ])("should request the first page %s", async (_, history) => {
    const { scope, loadHistory } = await createScope({ history });

    await allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: LESSON.id, data: { isPaid: false } },
    });

    expect(loadHistory).toHaveBeenCalledTimes(1);
    expect(loadHistory.mock.calls[0][0]).not.toHaveProperty("through");
  });

  it("should request the first page of a newly applied period whose history has not arrived", async () => {
    const { scope, loadHistory } = await createScope();
    const nextPeriod = {
      startDate: "2026-09-30T21:00:00.000Z",
      endDate: "2026-10-31T20:59:59.999Z",
    };
    await allSettled(statisticsModel.$appliedRange, { scope, params: nextPeriod });

    await allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: LESSON.id, data: { isPaid: false } },
    });

    expect(loadHistory).toHaveBeenCalledTimes(1);
    expect(loadHistory.mock.calls[0][0]).toEqual({ ...nextPeriod, version: 2 });
  });

  it("should not reload after a lesson is refetched for a server-side status change", async () => {
    const { scope, loadStatistics, loadHistory } = await createScope();

    await allSettled(lessonModel.syncLessonFx, { scope, params: LESSON.id });

    expect(loadStatistics).not.toHaveBeenCalled();
    expect(loadHistory).not.toHaveBeenCalled();
  });

  it("should load nothing while the reports page is closed", async () => {
    const { scope, loadStatistics, loadHistory } = await createScope({ isPageOpen: false });

    await allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: LESSON.id, data: { isPaid: false } },
    });

    expect(loadStatistics).not.toHaveBeenCalled();
    expect(loadHistory).not.toHaveBeenCalled();
  });

  it("should load nothing when the update fails", async () => {
    const { scope, loadStatistics, loadHistory } = await createScope({
      updateLesson: vi.fn().mockRejectedValue(new Error("fail")),
    });

    await allSettled(lessonModel.updateLessonFx, {
      scope,
      params: { id: LESSON.id, data: { isPaid: false } },
    });

    expect(loadStatistics).not.toHaveBeenCalled();
    expect(loadHistory).not.toHaveBeenCalled();
  });
});
