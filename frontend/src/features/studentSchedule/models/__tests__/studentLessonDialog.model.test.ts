import { allSettled, createWatch, fork } from "effector";
import { describe, expect, it, vi } from "vitest";

import { studentUserModel } from "@entities";
import { studentCabinetApi } from "@shared";
import type { StudentSession, StudentVisibleLesson } from "@shared";

import { callConfirmModel, callModel } from "../../../videoCall";
import type { StartCallParams } from "../../../videoCall";
import * as studentLessonDialogModel from "../studentLessonDialog.model";
import * as studentScheduleModel from "../studentSchedule.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    studentCabinetApi: { ...actual.studentCabinetApi, getLessonsByWeek: vi.fn() },
  };
});

const WEEK_START = new Date("2026-10-19T00:00:00");

const lesson: StudentVisibleLesson = {
  id: "l-1",
  subject: "MATHEMATICS",
  startTime: "2026-10-23T15:00:00",
  endTime: "2026-10-23T16:00:00",
  status: "SCHEDULED",
};

const session = (tutor: StudentSession["tutor"]): StudentSession => ({
  id: "su-1",
  email: "student@example.com",
  name: "Иван",
  isEmailVerified: true,
  tutor,
});

const setup = (tutor: StudentSession["tutor"] = { name: "Анна Кузнецова" }) => {
  const scope = fork({
    values: [
      [studentScheduleModel.$lessons, [lesson]],
      [studentScheduleModel.$weekStart, WEEK_START],
      [studentUserModel.$studentSession, session(tutor)],
    ],
  });
  const started: StartCallParams[] = [];
  createWatch({ unit: callModel.callStarted, fn: (call) => started.push(call), scope });
  return { scope, started };
};

describe("features/studentSchedule/models/studentLessonDialog.model", () => {
  it("should open the lesson by its id", async () => {
    const { scope } = setup();

    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    expect(scope.getState(studentLessonDialogModel.$openedLesson)).toEqual(lesson);
    expect(scope.getState(studentLessonDialogModel.$tutorName)).toBe("Анна Кузнецова");
  });

  it("should close the lesson when it is deleted over the WS", async () => {
    const { scope } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    await allSettled(studentScheduleModel.lessonDeleted, { scope, params: "l-1" });

    expect(scope.getState(studentLessonDialogModel.$openedLesson)).toBeNull();
    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBeNull();
  });

  it("should keep the lesson open when another lesson is deleted", async () => {
    const { scope } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    await allSettled(studentScheduleModel.lessonDeleted, { scope, params: "l-2" });

    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBe("l-1");
  });

  it("should close the lesson when it leaves the shown week", async () => {
    const { scope } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    await allSettled(studentScheduleModel.lessonUpdated, {
      scope,
      params: { ...lesson, startTime: "2026-11-02T15:00:00", endTime: "2026-11-02T16:00:00" },
    });

    expect(scope.getState(studentLessonDialogModel.$openedLesson)).toBeNull();
  });

  it("should not reopen a lesson that left the week and then came back", async () => {
    const { scope } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });
    await allSettled(studentScheduleModel.lessonUpdated, {
      scope,
      params: { ...lesson, startTime: "2026-11-02T15:00:00", endTime: "2026-11-02T16:00:00" },
    });

    await allSettled(studentScheduleModel.lessonUpdated, { scope, params: lesson });

    expect(scope.getState(studentScheduleModel.$lessons)).toEqual([lesson]);
    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBeNull();
    expect(scope.getState(studentLessonDialogModel.$openedLesson)).toBeNull();
  });

  it("should ask to confirm a call to the tutor about the lesson", async () => {
    const { scope, started } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    await allSettled(studentLessonDialogModel.callRequested, { scope });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(true);
    expect(scope.getState(callConfirmModel.$call)).toEqual({
      peerName: "Анна Кузнецова",
      lesson: {
        id: "l-1",
        subject: "MATHEMATICS",
        startTime: "2026-10-23T15:00:00",
        endTime: "2026-10-23T16:00:00",
      },
    });
    expect(started).toEqual([]);
  });

  it("should not ask anything without a tutor in the session", async () => {
    const { scope } = setup(null);
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    await allSettled(studentLessonDialogModel.callRequested, { scope });

    expect(scope.getState(callConfirmModel.$isOpen)).toBe(false);
  });

  it("should close the lesson and start the call once confirmed", async () => {
    const { scope, started } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });
    await allSettled(studentLessonDialogModel.callRequested, { scope });

    await allSettled(callConfirmModel.callConfirmed, { scope });

    expect(started).toHaveLength(1);
    expect(scope.getState(studentLessonDialogModel.$openedLesson)).toBeNull();
  });

  it("should keep the lesson open when the confirmation is dismissed", async () => {
    const { scope, started } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });
    await allSettled(studentLessonDialogModel.callRequested, { scope });

    await allSettled(callConfirmModel.confirmDismissed, { scope });

    expect(started).toEqual([]);
    expect(scope.getState(studentLessonDialogModel.$openedLesson)).toEqual(lesson);
  });

  it("should keep the week when the dialog is closed", async () => {
    const { scope } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    await allSettled(studentLessonDialogModel.dialogClosed, { scope });

    expect(scope.getState(studentLessonDialogModel.$openedLesson)).toBeNull();
    expect(scope.getState(studentScheduleModel.$weekStart)).toEqual(WEEK_START);
  });

  it("should not reopen a lesson that left the week once that week is shown again", async () => {
    const { scope } = setup();
    vi.mocked(studentCabinetApi.getLessonsByWeek).mockResolvedValue({
      weekStart: "2026-10-26",
      lessons: [],
    });
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    await allSettled(studentScheduleModel.nextWeek, { scope });

    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBeNull();
  });

  it("should forget the opened lesson when the schedule page closes", async () => {
    const { scope } = setup();
    await allSettled(studentLessonDialogModel.lessonOpened, { scope, params: "l-1" });

    await allSettled(studentScheduleModel.StudentSchedulePageGate.close, { scope, params: {} });

    expect(scope.getState(studentLessonDialogModel.$openedLessonId)).toBeNull();
  });
});
