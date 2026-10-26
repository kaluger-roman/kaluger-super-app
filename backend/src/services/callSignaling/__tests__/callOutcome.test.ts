import { INVITE_RATE_LIMIT, INVITE_RATE_WINDOW_MS } from "../callSignaling.constants";
import {
  isSamePair,
  resolveDropOutcome,
  resolveHangupStatus,
  toDropPeerMessage,
} from "../callSignaling.helpers";
import type { LiveCall, LiveCallStatus } from "../callSignaling.types";
import { registerInviteAttempt } from "../inviteRateLimit";

const buildCall = (status: LiveCallStatus): LiveCall => ({
  callId: "call-1",
  callerKind: "tutor",
  tutorUserId: "tutor-1",
  studentUserId: "student-user-1",
  studentId: "student-1",
  lesson: null,
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
  const START = 1_000_000;
  let now: number;

  beforeEach(() => {
    now = START;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should reject the attempt over the limit inside the window", () => {
    for (let attempt = 0; attempt < INVITE_RATE_LIMIT; attempt += 1) {
      now = START + attempt;
      expect(registerInviteAttempt(TUTOR)).toBe(true);
    }
    now = START + INVITE_RATE_LIMIT;
    expect(registerInviteAttempt(TUTOR)).toBe(false);
  });

  it("should allow invites again once the window has passed", () => {
    for (let attempt = 0; attempt < INVITE_RATE_LIMIT; attempt += 1) {
      registerInviteAttempt(TUTOR);
    }
    now = START + INVITE_RATE_WINDOW_MS;
    expect(registerInviteAttempt(TUTOR)).toBe(true);
  });

  it("should count each sender separately", () => {
    for (let attempt = 0; attempt < INVITE_RATE_LIMIT; attempt += 1) {
      registerInviteAttempt(TUTOR);
    }
    expect(registerInviteAttempt(STUDENT)).toBe(true);
  });
});

describe("toDropPeerMessage", () => {
  it("should map each drop outcome to the message the peer gets", () => {
    expect(toDropPeerMessage({ status: "COMPLETED", peerMessage: "call_ended" }, "c-1")).toEqual({
      type: "call_ended",
      callId: "c-1",
      reason: "peer_disconnected",
    });
    expect(toDropPeerMessage({ status: "CANCELED", peerMessage: "call_canceled" }, "c-1")).toEqual({
      type: "call_canceled",
      callId: "c-1",
      reason: "canceled",
    });
    expect(toDropPeerMessage({ status: "MISSED", peerMessage: "call_unavailable" }, "c-1")).toEqual(
      { type: "call_unavailable", reason: "offline", callId: "c-1" }
    );
  });
});

describe("isSamePair", () => {
  const pair = {
    tutorUserId: "tutor-1",
    studentUserId: "student-user-1",
    studentId: "student-1",
    studentName: "Иван",
    tutorName: "Анна",
  };

  it("should match a call between the same tutor and student", () => {
    expect(isSamePair(buildCall("ringing"), pair)).toBe(true);
  });

  it("should not match a call with another student", () => {
    expect(isSamePair(buildCall("ringing"), { ...pair, studentUserId: "student-user-2" })).toBe(
      false
    );
  });
});
