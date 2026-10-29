import { allSettled, fork } from "effector";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLessonCalls } from "../../api/callHistoryApi";
import type { CallHistoryRecord } from "../../callRecord.types";
import { $lessonCalls, LessonCallsGate, refreshRequested } from "../lessonCalls.model";

vi.mock("../../api/callHistoryApi", () => ({
  getCallHistory: vi.fn(),
  getLessonCalls: vi.fn(),
}));

const mockedGetLessonCalls = vi.mocked(getLessonCalls);

const call = (id: string): CallHistoryRecord => ({
  id,
  peerName: "Иван",
  direction: "outgoing",
  startedAt: "2026-10-22T15:01:00.000Z",
  durationSeconds: 60,
  status: "COMPLETED",
  lesson: null,
});

describe("entities/callRecord/model/lessonCalls.model", () => {
  beforeEach(() => {
    mockedGetLessonCalls.mockReset();
  });

  it("should load the calls of the lesson when the gate opens", async () => {
    const scope = fork();
    mockedGetLessonCalls.mockResolvedValue([call("c-1")]);

    await allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });

    expect(mockedGetLessonCalls).toHaveBeenCalledWith("lesson-1");
    expect(scope.getState($lessonCalls)).toEqual([call("c-1")]);
  });

  it("should not let a failed load of a closed lesson clear the calls of the open one", async () => {
    const scope = fork();
    let failA: (error: Error) => void = () => undefined;
    mockedGetLessonCalls.mockReturnValueOnce(
      new Promise((_, reject) => {
        failA = reject;
      })
    );
    const openingA = allSettled(LessonCallsGate.open, { scope, params: "lesson-a" });
    const closingA = allSettled(LessonCallsGate.close, { scope, params: "lesson-a" });
    mockedGetLessonCalls.mockResolvedValueOnce([call("c-b")]);
    const openingB = allSettled(LessonCallsGate.open, { scope, params: "lesson-b" });

    failA(new Error("network"));
    await Promise.all([openingA, closingA, openingB]);

    expect(scope.getState($lessonCalls)).toEqual([call("c-b")]);
  });

  it("should not let an older load overwrite a newer refresh", async () => {
    const scope = fork();
    let releaseLoad: (records: CallHistoryRecord[]) => void = () => undefined;
    mockedGetLessonCalls.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseLoad = resolve;
      })
    );
    const opening = allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });
    mockedGetLessonCalls.mockResolvedValueOnce([call("c-2"), call("c-1")]);
    const refreshing = allSettled(refreshRequested, { scope });

    releaseLoad([call("c-1")]);
    await Promise.all([opening, refreshing]);

    expect(scope.getState($lessonCalls)).toEqual([call("c-2"), call("c-1")]);
  });

  it("should not apply a response that arrives after the gate closed", async () => {
    const scope = fork();
    let release: (records: CallHistoryRecord[]) => void = () => undefined;
    mockedGetLessonCalls.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    const opening = allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });

    const closing = allSettled(LessonCallsGate.close, { scope, params: "lesson-1" });
    release([call("c-1")]);
    await Promise.all([opening, closing]);

    expect(scope.getState($lessonCalls)).toEqual([]);
  });

  it("should refresh the calls in the background only while the gate is open", async () => {
    const closed = fork();
    await allSettled(refreshRequested, { scope: closed });
    expect(mockedGetLessonCalls).not.toHaveBeenCalled();

    const scope = fork();
    mockedGetLessonCalls.mockResolvedValueOnce([call("c-1")]);
    await allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });
    mockedGetLessonCalls.mockResolvedValueOnce([call("c-2"), call("c-1")]);

    await allSettled(refreshRequested, { scope });

    expect(mockedGetLessonCalls).toHaveBeenLastCalledWith("lesson-1");
    expect(scope.getState($lessonCalls)).toEqual([call("c-2"), call("c-1")]);
  });

  it("should keep the shown calls when a background refresh fails", async () => {
    const scope = fork();
    mockedGetLessonCalls.mockResolvedValueOnce([call("c-1")]);
    await allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });
    mockedGetLessonCalls.mockRejectedValueOnce(new Error("network"));

    await allSettled(refreshRequested, { scope });

    expect(scope.getState($lessonCalls)).toEqual([call("c-1")]);
  });

  it("should show nothing when the calls cannot be loaded", async () => {
    const scope = fork({ values: [[$lessonCalls, [call("old")]]] });
    mockedGetLessonCalls.mockRejectedValue(new Error("network"));

    await allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });

    expect(scope.getState($lessonCalls)).toEqual([]);
  });

  it("should not request anything when the gate closes", async () => {
    const scope = fork();
    mockedGetLessonCalls.mockResolvedValue([call("c-1")]);
    await allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });

    await allSettled(LessonCallsGate.close, { scope, params: "lesson-1" });

    expect(mockedGetLessonCalls).toHaveBeenCalledTimes(1);
  });

  it("should load the calls again when the same lesson is reopened", async () => {
    const scope = fork();
    mockedGetLessonCalls.mockResolvedValue([call("c-1")]);
    await allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });
    await allSettled(LessonCallsGate.close, { scope, params: "lesson-1" });

    await allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });

    expect(mockedGetLessonCalls).toHaveBeenCalledTimes(2);
    expect(scope.getState($lessonCalls)).toEqual([call("c-1")]);
  });

  it("should clear the calls when the gate closes", async () => {
    const scope = fork();
    mockedGetLessonCalls.mockResolvedValue([call("c-1")]);
    await allSettled(LessonCallsGate.open, { scope, params: "lesson-1" });

    await allSettled(LessonCallsGate.close, { scope, params: "lesson-1" });

    expect(scope.getState($lessonCalls)).toEqual([]);
  });
});
