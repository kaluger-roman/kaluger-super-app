import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callModel } from "../index";
import type { CallSignalingInbound } from "../signaling.types";
import { setWebRtcAdapter } from "../webrtc.helpers";
import {
  installTransport,
  receive,
  resetCallFlow,
  ringCurrentInvite,
  settleMicrotasks,
} from "./callFlow";
import { createFakeAdapter } from "./fakeWebrtc";
import { readStore } from "./storeProbe";

describe("features/videoCall full caller lifecycle", () => {
  let sent: CallSignalingInbound[];

  beforeEach(() => {
    sent = installTransport();
    setWebRtcAdapter(createFakeAdapter());
  });

  afterEach(() => {
    resetCallFlow();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const sentTypes = () => sent.map((m) => m.type);

  it("should send call_invite with a fresh inviteId on callStarted", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "stu-1", peerName: "Иван", lesson: null },
    });
    expect(sent[0]).toEqual({
      type: "call_invite",
      inviteId: scope.getState(callModel.$inviteId),
      targetStudentId: "stu-1",
    });
    expect(scope.getState(callModel.$inviteId)).toEqual(expect.any(String));
    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
  });

  it("should acquire media and emit a webrtc_offer after call_accepted, then go active on connect", async () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    ringCurrentInvite("call-1");
    sent.length = 0;

    receive({ type: "call_accepted", callId: "call-1", iceServers: [{ urls: "stun:example" }] });
    await settleMicrotasks();

    expect(sentTypes()).toContain("webrtc_offer");
    expect(readStore(callModel.$callPhase)).toBe("connecting");

    callModel.callConnected();
    expect(readStore(callModel.$callPhase)).toBe("active");

    callModel.hangUp();
    await settleMicrotasks();
    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(sent).toContainEqual({ type: "call_hangup", callId: "call-1" });
  });

  it("should send call_hangup with the current callId on hangUp", async () => {
    const scope = fork();
    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-7", callerName: "Анна", role: "tutor", lesson: null },
    });
    sent.length = 0;
    void allSettled(callModel.hangUp, { scope });
    await settleMicrotasks();

    expect(sent).toContainEqual({ type: "call_hangup", callId: "call-7" });
  });

  it("should count one second per tick while active", async () => {
    vi.useFakeTimers();
    const scope: Scope = fork();
    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-1", callerName: "Анна", role: "tutor", lesson: null },
    });
    void allSettled(callModel.callConnected, { scope });
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(3000);
    expect(scope.getState(callModel.$callDurationSeconds)).toBe(3);

    void allSettled(callModel.hangUp, { scope });
    await vi.advanceTimersByTimeAsync(0);
  });

  it("should return to idle on call_rejected", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "s", peerName: "N", lesson: null },
    });
    await allSettled(callModel.rejectedReceived, { scope });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should send call_invite with the lesson and without targetStudentId when the student starts a call", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: {
        peerName: "Анна",
        lesson: {
          id: "lesson-1",
          subject: "MATHEMATICS",
          startTime: "2026-10-23T15:00:00.000Z",
          endTime: "2026-10-23T16:00:00.000Z",
        },
      },
    });
    expect(sent[0]).toEqual({
      type: "call_invite",
      inviteId: expect.any(String),
      lessonId: "lesson-1",
    });
    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
  });
});
