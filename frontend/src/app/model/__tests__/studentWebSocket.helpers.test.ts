import { createWatch } from "effector";
import type { Unit } from "effector";
import { afterEach, describe, expect, it, vi } from "vitest";

import { studentScheduleModel } from "@features/studentSchedule";
import { dispatchCallSignal } from "@features/videoCall";

import { dispatchStudentMessage } from "../studentWebSocket.helpers";

vi.mock("@features/videoCall", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@features/videoCall")>();
  return { ...actual, dispatchCallSignal: vi.fn() };
});

const collect = <T>(unit: Unit<T>) => {
  const calls: T[] = [];
  const watcher = createWatch({ unit, fn: (value) => calls.push(value) });
  return { calls, unwatch: () => watcher.unsubscribe() };
};

const lesson = { id: "l-1", startTime: "2026-10-21T10:00:00.000Z" };

describe("app/model/studentWebSocket.helpers dispatchStudentMessage", () => {
  afterEach(() => {
    vi.mocked(dispatchCallSignal).mockClear();
  });

  it("should route a call signal to the call model as the student", () => {
    dispatchStudentMessage({ type: "call_busy", inviteId: "i-1" });

    expect(dispatchCallSignal).toHaveBeenCalledWith(
      { type: "call_busy", inviteId: "i-1" },
      "student"
    );
  });

  it("should route lesson events to the schedule", () => {
    const created = collect(studentScheduleModel.lessonCreated);
    const updated = collect(studentScheduleModel.lessonUpdated);
    const deleted = collect(studentScheduleModel.lessonDeleted);
    const statuses = collect(studentScheduleModel.lessonStatusUpdated);

    dispatchStudentMessage({ type: "lesson_created", lesson });
    dispatchStudentMessage({ type: "lesson_updated", lesson });
    dispatchStudentMessage({ type: "lesson_deleted", lessonId: "l-1" });
    dispatchStudentMessage({ type: "lesson_status_updated", lessonId: "l-1", status: "COMPLETED" });
    [created, updated, deleted, statuses].forEach((probe) => probe.unwatch());

    expect(created.calls).toEqual([lesson]);
    expect(updated.calls).toEqual([lesson]);
    expect(deleted.calls).toEqual(["l-1"]);
    expect(statuses.calls).toEqual([{ lessonId: "l-1", status: "COMPLETED" }]);
    expect(dispatchCallSignal).not.toHaveBeenCalled();
  });

  it("should ignore a message that is not an object", () => {
    dispatchStudentMessage("lesson_deleted");

    expect(dispatchCallSignal).not.toHaveBeenCalled();
  });
});
