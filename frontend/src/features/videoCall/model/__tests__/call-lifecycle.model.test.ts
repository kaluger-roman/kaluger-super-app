import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callModel,
  dispatchCallSignal,
  setCallTransport,
  setWebRtcAdapter,
  stopAllSessions,
} from "../index";
import { createFakeAdapter } from "./fakeWebrtc";

const settleMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

describe("features/videoCall full caller lifecycle", () => {
  let sent: Array<{ type: string; [key: string]: unknown }>;

  beforeEach(() => {
    sent = [];
    setCallTransport((message) => sent.push(message));
    setWebRtcAdapter(createFakeAdapter());
  });

  afterEach(() => {
    stopAllSessions();
    setCallTransport(null);
    vi.restoreAllMocks();
  });

  const sentTypes = () => sent.map((m) => m.type);

  it("should send call_invite on callStarted", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "stu-1", peerName: "Иван" },
    });
    expect(sent[0]).toEqual({ type: "call_invite", targetStudentId: "stu-1" });
    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
  });

  it("should acquire media and emit a webrtc_offer after call_accepted, then go active on connect", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "stu-1", peerName: "Иван" },
    });
    sent = [];

    dispatchCallSignal({
      type: "call_accepted",
      callId: "call-1",
      iceServers: [{ urls: "stun:example" }],
    });
    await settleMicrotasks();

    expect(sentTypes()).toContain("webrtc_offer");

    void allSettled(callModel.callConnected, { scope });
    await settleMicrotasks();
    expect(scope.getState(callModel.$callPhase)).toBe("active");

    void allSettled(callModel.hangUp, { scope });
    await settleMicrotasks();
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should send call_hangup with the current callId on hangUp", async () => {
    const scope = fork();
    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-7", callerName: "Анна" },
    });
    sent = [];
    void allSettled(callModel.hangUp, { scope });
    await settleMicrotasks();

    expect(sent).toContainEqual({ type: "call_hangup", callId: "call-7" });
  });

  it("should tick the duration while active", async () => {
    vi.useFakeTimers();
    const scope: Scope = fork();
    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-1", callerName: "Анна" },
    });
    void allSettled(callModel.callConnected, { scope });
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(3000);
    expect(scope.getState(callModel.$callDurationSeconds)).toBeGreaterThanOrEqual(2);

    void allSettled(callModel.hangUp, { scope });
    await vi.advanceTimersByTimeAsync(0);
    vi.useRealTimers();
  });

  it("should return to idle on call_rejected", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "s", peerName: "N" },
    });
    await allSettled(callModel.rejectedReceived, { scope });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should send call_invite without targetStudentId when the student starts a call", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { peerName: "Анна" },
    });
    expect(sent[0]).toEqual({ type: "call_invite" });
    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
  });
});
