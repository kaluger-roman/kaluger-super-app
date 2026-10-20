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
    vi.clearAllMocks();
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
    await allSettled(refreshRequested, { scope });

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

    const retry = allSettled(refreshRequested, { scope });

    expect(scope.getState($loadFailed)).toBe(true);
    expect(scope.getState($isLoading)).toBe(true);
    release(sampleRecords);
    await retry;
    expect(scope.getState($loadFailed)).toBe(false);
  });
});
