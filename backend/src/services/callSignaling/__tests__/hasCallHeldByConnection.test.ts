import { hasCallHeldByConnection, isCallAwaitingReturnOf } from "../callFlow";
import * as callRegistry from "../callSignaling";
import type { ResolvedPair } from "../callSignaling.types";

jest.mock("../../../lib/wsManager", () => ({ getWebSocketManager: () => null }));

const pair: ResolvedPair = {
  tutorUserId: "tutor-1",
  studentUserId: "student-user-1",
  studentId: "student-1",
  studentName: "Иван",
  tutorName: "Анна",
};

describe("hasCallHeldByConnection", () => {
  it("should hold a ringing call for the caller only", () => {
    callRegistry.startCall(pair, "tutor", null, () => undefined);

    expect(hasCallHeldByConnection("tutor", "tutor-1")).toBe(true);
    expect(hasCallHeldByConnection("student", "student-user-1")).toBe(false);
  });

  it("should hold an accepted and a connected call for both participants", () => {
    const call = callRegistry.startCall(pair, "student", null, () => undefined);

    callRegistry.markAccepted(call.callId);
    expect(hasCallHeldByConnection("tutor", "tutor-1")).toBe(true);
    expect(hasCallHeldByConnection("student", "student-user-1")).toBe(true);

    callRegistry.markConnected(call.callId);
    expect(hasCallHeldByConnection("tutor", "tutor-1")).toBe(true);
    expect(hasCallHeldByConnection("student", "student-user-1")).toBe(true);
  });

  it("should hold no call that waits for its participant to come back, until call_resume (regression: a hidden tab let in by 4004 kept the returning phone waiting)", () => {
    const call = callRegistry.startCall(pair, "tutor", null, () => undefined);
    callRegistry.markAccepted(call.callId);
    callRegistry.markDisconnected(call.callId, "student", new Date(), undefined, () => undefined);

    expect(hasCallHeldByConnection("student", "student-user-1")).toBe(false);
    expect(isCallAwaitingReturnOf("student", "student-user-1", "tab-a")).toBe(true);
    expect(hasCallHeldByConnection("tutor", "tutor-1")).toBe(true);
    expect(isCallAwaitingReturnOf("tutor", "tutor-1", "tab-a")).toBe(false);

    callRegistry.markReconnected(call.callId, "student");
    expect(hasCallHeldByConnection("student", "student-user-1")).toBe(true);
    expect(isCallAwaitingReturnOf("student", "student-user-1", "tab-a")).toBe(false);
  });

  it("should wait for a caller that lost the connection while its call rang", () => {
    const call = callRegistry.startCall(pair, "tutor", null, () => undefined);
    callRegistry.markDisconnected(call.callId, "tutor", new Date(), undefined, () => undefined);

    expect(hasCallHeldByConnection("tutor", "tutor-1")).toBe(false);
    expect(isCallAwaitingReturnOf("tutor", "tutor-1", "tab-a")).toBe(true);
    expect(isCallAwaitingReturnOf("student", "student-user-1", "tab-a")).toBe(false);
  });

  it("should keep the call waiting only for the page whose connection was lost (regression: tabs released by 4004 displaced each other)", () => {
    const call = callRegistry.startCall(pair, "tutor", null, () => undefined);
    callRegistry.markAccepted(call.callId);
    callRegistry.markDisconnected(call.callId, "student", new Date(), "phone", () => undefined);

    expect(isCallAwaitingReturnOf("student", "student-user-1", "phone")).toBe(true);
    expect(isCallAwaitingReturnOf("student", "student-user-1", "desktop")).toBe(false);
    expect(isCallAwaitingReturnOf("student", "student-user-1", undefined)).toBe(false);

    callRegistry.markReconnected(call.callId, "student");
    callRegistry.markDisconnected(call.callId, "student", new Date(), "desktop", () => undefined);
    expect(isCallAwaitingReturnOf("student", "student-user-1", "desktop")).toBe(true);
    expect(isCallAwaitingReturnOf("student", "student-user-1", "phone")).toBe(false);
  });

  it("should hold no call once it is removed or for someone else", () => {
    const call = callRegistry.startCall(pair, "tutor", null, () => undefined);

    expect(hasCallHeldByConnection("tutor", "tutor-2")).toBe(false);
    callRegistry.removeCall(call.callId);
    expect(hasCallHeldByConnection("tutor", "tutor-1")).toBe(false);
  });
});
