import { hasActiveCall } from "../callFlow";
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

describe("hasActiveCall", () => {
  it("should report a ringing call for both participants", () => {
    callRegistry.startCall(pair, "tutor", null, () => undefined);

    expect(hasActiveCall("tutor", "tutor-1")).toBe(true);
    expect(hasActiveCall("student", "student-user-1")).toBe(true);
  });

  it("should report an accepted and a connected call", () => {
    const call = callRegistry.startCall(pair, "student", null, () => undefined);

    callRegistry.markAccepted(call.callId);
    expect(hasActiveCall("tutor", "tutor-1")).toBe(true);

    callRegistry.markConnected(call.callId);
    expect(hasActiveCall("tutor", "tutor-1")).toBe(true);
  });

  it("should report no call once it is removed or for someone else", () => {
    const call = callRegistry.startCall(pair, "tutor", null, () => undefined);

    expect(hasActiveCall("tutor", "tutor-2")).toBe(false);
    callRegistry.removeCall(call.callId);
    expect(hasActiveCall("tutor", "tutor-1")).toBe(false);
  });
});
