import type { IncomingMessage } from "http";
import { WebSocket } from "ws";

import { hasCallHeldByConnection, isCallAwaitingReturnOf } from "../../../services/callSignaling";
import { REPLACED_CLOSE_CODE } from "../connection.constants";
import { toTakeoverDecision } from "../connection.helpers";
import type { TabSocket } from "../types";

jest.mock("../../../services/callSignaling", () => ({
  hasCallHeldByConnection: jest.fn(() => false),
  isCallAwaitingReturnOf: jest.fn(() => false),
}));

const socket = (tabId: string): TabSocket => ({ readyState: WebSocket.OPEN, tabId }) as TabSocket;
const request = (url: string): IncomingMessage => ({ url }) as IncomingMessage;

const RESUME = request("/ws/student?token=s&tab=phone&resume=1");
const FRESH = request("/ws/student?token=s&tab=phone");
const REFUSE = {
  action: "refuse",
  code: REPLACED_CLOSE_CODE,
  reason: "Connection held by another tab",
};

describe("toTakeoverDecision", () => {
  beforeEach(() => {
    jest.mocked(hasCallHeldByConnection).mockReset().mockReturnValue(false);
    jest.mocked(isCallAwaitingReturnOf).mockReset().mockReturnValue(false);
  });

  it("should keep a new socket waiting while the live one holds the call", () => {
    jest.mocked(hasCallHeldByConnection).mockReturnValue(true);

    expect(
      toTakeoverDecision("student", "s-1", socket("desktop"), socket("phone"), RESUME)
    ).toEqual({ action: "wait" });
    expect(hasCallHeldByConnection).toHaveBeenCalledWith("student", "s-1");
  });

  it("should refuse an automatic reconnect while the live socket has no call to give", () => {
    expect(
      toTakeoverDecision("student", "s-1", socket("desktop"), socket("phone"), RESUME)
    ).toEqual(REFUSE);
    expect(toTakeoverDecision("student", "s-1", socket("desktop"), socket("phone"), FRESH)).toEqual(
      { action: "register" }
    );
  });

  it("should let a reconnect take the connection while the call waits for its participant to come back (regression: the returning phone waited behind a hidden tab that never picked the call up)", () => {
    jest.mocked(isCallAwaitingReturnOf).mockReturnValue(true);

    expect(
      toTakeoverDecision("student", "s-1", socket("desktop"), socket("phone"), RESUME)
    ).toEqual({ action: "register" });
    expect(isCallAwaitingReturnOf).toHaveBeenCalledWith("student", "s-1", "phone");
  });

  it("should refuse a reconnect of a tab that did not hold the call waiting for its participant (regression: tabs released by 4004 displaced each other)", () => {
    jest
      .mocked(isCallAwaitingReturnOf)
      .mockImplementation((_kind, _id, tabId) => tabId === "phone");

    expect(
      toTakeoverDecision("student", "s-1", socket("desktop-a"), socket("desktop-b"), RESUME)
    ).toEqual(REFUSE);
    expect(isCallAwaitingReturnOf).toHaveBeenCalledWith("student", "s-1", "desktop-b");
  });

  it("should let the same tab replace its own socket", () => {
    jest.mocked(hasCallHeldByConnection).mockReturnValue(true);

    expect(toTakeoverDecision("student", "s-1", socket("phone"), socket("phone"), RESUME)).toEqual({
      action: "register",
    });
  });
});
