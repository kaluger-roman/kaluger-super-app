import { allSettled, createWatch, fork } from "effector";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@shared";

import { getCallHistory } from "../../api/callHistoryApi";
import {
  $callHistory,
  $isLoading,
  $loadFailed,
  CallHistoryGate,
  loadCallHistoryFx,
  refreshRequested,
  retryRequested,
} from "../callHistory.model";

vi.mock("../../api/callHistoryApi", () => ({
  getCallHistory: vi.fn(),
}));

const mockedGetCallHistory = vi.mocked(getCallHistory);

const sampleRecords = [
  {
    id: "1",
    peerName: "Иван Смирнов",
    direction: "outgoing" as const,
    startedAt: "2026-06-03T14:32:00.000Z",
    durationSeconds: 1845,
    status: "completed" as const,
  },
];

describe("entities/callRecord/model/callHistory.model", () => {
  beforeEach(() => {
    mockedGetCallHistory.mockReset();
  });

  it("should load the tutor history when the gate opens for a tutor", async () => {
    mockedGetCallHistory.mockResolvedValue(sampleRecords);
    const scope = fork();

    await allSettled(CallHistoryGate.open, { scope, params: "tutor" });

    expect(mockedGetCallHistory).toHaveBeenCalledTimes(1);
    expect(mockedGetCallHistory).toHaveBeenCalledWith("tutor");
    expect(scope.getState($callHistory)).toEqual(sampleRecords);
  });

  it("should request the student history when the gate opens for a student", async () => {
    mockedGetCallHistory.mockResolvedValue([]);
    const scope = fork();

    await allSettled(CallHistoryGate.open, { scope, params: "student" });

    expect(mockedGetCallHistory).toHaveBeenCalledWith("student");
  });

  it("should keep an empty list and not throw when the request fails", async () => {
    mockedGetCallHistory.mockRejectedValue(new Error("network"));
    const scope = fork();

    await allSettled(loadCallHistoryFx, { scope, params: "tutor" });

    expect(scope.getState($callHistory)).toEqual([]);
  });

  it("should show an error toast and clear stale records when the request fails", async () => {
    mockedGetCallHistory.mockResolvedValueOnce(sampleRecords);
    const scope = fork();
    await allSettled(CallHistoryGate.open, { scope, params: "tutor" });

    const errors: string[] = [];
    createWatch({
      unit: notificationsModel.showErrorEvent,
      fn: (text) => errors.push(text),
      scope,
    });
    mockedGetCallHistory.mockRejectedValueOnce(new Error("network"));
    await allSettled(loadCallHistoryFx, { scope, params: "tutor" });

    expect(scope.getState($callHistory)).toEqual([]);
    expect(errors).toEqual(["Не удалось загрузить историю звонков"]);
  });

  it("should clear the history when the page gate closes", async () => {
    mockedGetCallHistory.mockResolvedValue(sampleRecords);
    const scope = fork();
    await allSettled(CallHistoryGate.open, { scope, params: "tutor" });

    await allSettled(CallHistoryGate.close, { scope, params: "tutor" });

    expect(scope.getState($callHistory)).toEqual([]);
  });

  it("should flag a failed load and clear the flag after a successful retry", async () => {
    mockedGetCallHistory.mockRejectedValueOnce(new Error("network"));
    const scope = fork();
    await allSettled(CallHistoryGate.open, { scope, params: "tutor" });
    expect(scope.getState($loadFailed)).toBe(true);

    mockedGetCallHistory.mockResolvedValueOnce(sampleRecords);
    await allSettled(retryRequested, { scope });

    expect(scope.getState($loadFailed)).toBe(false);
    expect(scope.getState($callHistory)).toEqual(sampleRecords);
  });

  it("should refetch the open history for the same principal on refresh", async () => {
    mockedGetCallHistory.mockResolvedValue([]);
    const scope = fork();
    await allSettled(CallHistoryGate.open, { scope, params: "student" });
    mockedGetCallHistory.mockClear();

    await allSettled(refreshRequested, { scope });

    expect(mockedGetCallHistory).toHaveBeenCalledWith("student");
  });

  it("should not fetch on refresh while the history page is closed", async () => {
    const scope = fork();

    await allSettled(refreshRequested, { scope });

    expect(mockedGetCallHistory).not.toHaveBeenCalled();
  });

  it("should keep the failure flag while a retry is still loading", async () => {
    mockedGetCallHistory.mockRejectedValueOnce(new Error("network"));
    const scope = fork();
    await allSettled(CallHistoryGate.open, { scope, params: "tutor" });
    let release: (records: typeof sampleRecords) => void = () => undefined;
    mockedGetCallHistory.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      })
    );

    const retry = allSettled(retryRequested, { scope });

    expect(scope.getState($loadFailed)).toBe(true);
    expect(scope.getState($isLoading)).toBe(true);
    release(sampleRecords);
    await retry;
    expect(scope.getState($loadFailed)).toBe(false);
  });

  it("should keep the shown list without a toast or blocking when a refresh fails", async () => {
    mockedGetCallHistory.mockResolvedValueOnce(sampleRecords);
    const scope = fork();
    await allSettled(CallHistoryGate.open, { scope, params: "tutor" });
    const errors: string[] = [];
    createWatch({
      unit: notificationsModel.showErrorEvent,
      fn: (text) => errors.push(text),
      scope,
    });
    mockedGetCallHistory.mockRejectedValueOnce(new Error("network"));

    const refresh = allSettled(refreshRequested, { scope });
    expect(scope.getState($isLoading)).toBe(false);
    await refresh;

    expect(scope.getState($callHistory)).toEqual(sampleRecords);
    expect(scope.getState($loadFailed)).toBe(false);
    expect(errors).toEqual([]);
  });

  it("should drop a response that arrives after the page closed", async () => {
    let release: (records: typeof sampleRecords) => void = () => undefined;
    mockedGetCallHistory.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    const scope = fork();
    const load = allSettled(CallHistoryGate.open, { scope, params: "tutor" });

    const close = allSettled(CallHistoryGate.close, { scope, params: "tutor" });
    release(sampleRecords);
    await Promise.all([load, close]);

    expect(scope.getState($callHistory)).toEqual([]);
  });

  it("should drop a failure that arrives after the page closed", async () => {
    let fail: (error: Error) => void = () => undefined;
    mockedGetCallHistory.mockReturnValueOnce(
      new Promise((_, reject) => {
        fail = reject;
      })
    );
    const scope = fork();
    const errors: string[] = [];
    createWatch({
      unit: notificationsModel.showErrorEvent,
      fn: (text) => errors.push(text),
      scope,
    });
    const load = allSettled(CallHistoryGate.open, { scope, params: "tutor" });

    const close = allSettled(CallHistoryGate.close, { scope, params: "tutor" });
    fail(new Error("network"));
    await Promise.all([load, close]);

    expect(scope.getState($loadFailed)).toBe(false);
    expect(errors).toEqual([]);
  });

  it("should run a refresh requested mid-flight after the current request", async () => {
    const newerRecords = [{ ...sampleRecords[0], id: "2" }, ...sampleRecords];
    let release: (records: typeof sampleRecords) => void = () => undefined;
    mockedGetCallHistory
      .mockReturnValueOnce(
        new Promise((resolve) => {
          release = resolve;
        })
      )
      .mockResolvedValueOnce(newerRecords);
    const scope = fork();
    const load = allSettled(CallHistoryGate.open, { scope, params: "tutor" });

    const refresh = allSettled(refreshRequested, { scope });
    expect(mockedGetCallHistory).toHaveBeenCalledTimes(1);
    release(sampleRecords);
    await Promise.all([load, refresh]);

    expect(mockedGetCallHistory).toHaveBeenCalledTimes(2);
    expect(scope.getState($callHistory)).toEqual(newerRecords);
  });
});
