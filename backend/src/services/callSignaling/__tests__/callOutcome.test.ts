import { INVITE_RATE_LIMIT, INVITE_RATE_WINDOW_MS } from "../callSignaling.constants";
import { resolveDropOutcome, resolveHangupStatus } from "../callSignaling.helpers";
import type { LiveCall, LiveCallStatus } from "../callSignaling.types";
import { __resetInviteRateLimitForTest, registerInviteAttempt } from "../inviteRateLimit";

const buildCall = (status: LiveCallStatus): LiveCall => ({
  callId: "call-1",
  callerKind: "tutor",
  tutorUserId: "tutor-1",
  studentUserId: "student-user-1",
  studentId: "student-1",
  studentName: "Иван",
  tutorName: "Анна",
  status,
  startedAt: new Date(),
});

const TUTOR = { kind: "tutor" as const, id: "tutor-1" };
const STUDENT = { kind: "student" as const, id: "student-user-1" };

describe("resolveDropOutcome", () => {
  it("should finish a connected call as COMPLETED with call_ended", () => {
    expect(resolveDropOutcome(buildCall("connected"), STUDENT)).toEqual({
      status: "COMPLETED",
      peerMessage: "call_ended",
    });
  });

  it("should finish an accepted but not connected call as FAILED with call_ended", () => {
    expect(resolveDropOutcome(buildCall("accepted"), STUDENT)).toEqual({
      status: "FAILED",
      peerMessage: "call_ended",
    });
  });

  it("should cancel a ringing call when the caller drops", () => {
    expect(resolveDropOutcome(buildCall("ringing"), TUTOR)).toEqual({
      status: "CANCELED",
      peerMessage: "call_canceled",
    });
  });

  it("should mark a ringing call MISSED and report the callee offline when the callee drops", () => {
    expect(resolveDropOutcome(buildCall("ringing"), STUDENT)).toEqual({
      status: "MISSED",
      peerMessage: "call_unavailable",
    });
  });
});

describe("resolveHangupStatus", () => {
  it("should be COMPLETED for a connected call", () => {
    expect(resolveHangupStatus(buildCall("connected"))).toBe("COMPLETED");
  });

  it("should be FAILED when media never connected", () => {
    expect(resolveHangupStatus(buildCall("accepted"))).toBe("FAILED");
  });
});

describe("registerInviteAttempt", () => {
  beforeEach(() => {
    __resetInviteRateLimitForTest();
  });

  it("should reject the attempt over the limit inside the window", () => {
    const now = 1_000_000;
    for (let attempt = 0; attempt < INVITE_RATE_LIMIT; attempt += 1) {
      expect(registerInviteAttempt(TUTOR, now + attempt)).toBe(true);
    }
    expect(registerInviteAttempt(TUTOR, now + INVITE_RATE_LIMIT)).toBe(false);
  });

  it("should allow invites again once the window has passed", () => {
    const now = 1_000_000;
    for (let attempt = 0; attempt < INVITE_RATE_LIMIT; attempt += 1) {
      registerInviteAttempt(TUTOR, now);
    }
    expect(registerInviteAttempt(TUTOR, now + INVITE_RATE_WINDOW_MS)).toBe(true);
  });

  it("should count each sender separately", () => {
    const now = 1_000_000;
    for (let attempt = 0; attempt < INVITE_RATE_LIMIT; attempt += 1) {
      registerInviteAttempt(TUTOR, now);
    }
    expect(registerInviteAttempt(STUDENT, now)).toBe(true);
  });
});
