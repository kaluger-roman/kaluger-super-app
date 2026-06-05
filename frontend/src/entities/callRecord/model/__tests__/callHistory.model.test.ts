import { allSettled, fork } from "effector";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCallHistory } from "../../api/callHistoryApi";
import {
  $callHistory,
  CallHistoryGate,
  loadCallHistoryFx,
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
});
