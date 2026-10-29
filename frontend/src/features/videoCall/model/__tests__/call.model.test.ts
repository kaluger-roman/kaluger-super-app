import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { callModel } from "../index";
import type { CallRole, CallSignalingInbound } from "../signaling.types";
import { setCallTransport } from "../transport.helpers";
import { installTransport, resetCallFlow, settleMicrotasks } from "./callFlow";
import { createFakeAdapter } from "./fakeWebrtc";

const startConnectedCall = async (scope: Scope): Promise<void> => {
  await allSettled(callModel.incomingCallReceived, {
    scope,
    params: { callId: "call-1", callerName: "Анна", role: "tutor", lesson: null },
  });
  void allSettled(callModel.callConnected, { scope });
  await settleMicrotasks();
};

describe("features/videoCall/model/call.model transitions", () => {
  beforeEach(() => {
    installTransport();
  });

  afterEach(() => {
    resetCallFlow();
  });

  it("should move to outgoing and set the peer on callStarted", async () => {
    const scope = fork();

    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "stu-1", peerName: "Иван Смирнов", lesson: null },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
    expect(scope.getState(callModel.$outgoingCallPeer)).toEqual({
      name: "Иван Смирнов",
      role: "student",
    });
    expect(scope.getState(callModel.$callRole)).toBe("tutor");
  });

  it("should set the tutor as the peer when the student starts a call", async () => {
    const scope = fork();

    await allSettled(callModel.callStarted, {
      scope,
      params: {
        peerName: "Анна Петрова",
        lesson: {
          id: "lesson-1",
          subject: "MATHEMATICS",
          startTime: "2026-10-23T15:00:00.000Z",
          endTime: "2026-10-23T16:00:00.000Z",
        },
      },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
    expect(scope.getState(callModel.$outgoingCallPeer)).toEqual({
      name: "Анна Петрова",
      role: "tutor",
    });
    expect(scope.getState(callModel.$callRole)).toBe("student");
  });

  it("should move to incoming and store the caller on incomingCallReceived", async () => {
    const scope = fork();

    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-1", callerName: "Анна Петрова", role: "student", lesson: null },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("incoming");
    expect(scope.getState(callModel.$incomingCall)).toEqual({
      callId: "call-1",
      lesson: null,
      callerName: "Анна Петрова",
      role: "student",
    });
    expect(scope.getState(callModel.$callRole)).toBe("student");
  });

  it("should move to active on callConnected", async () => {
    const scope = fork();

    await startConnectedCall(scope);

    expect(scope.getState(callModel.$callPhase)).toBe("active");
    expect(scope.getState(callModel.$isConnecting)).toBe(false);

    void allSettled(callModel.hangUp, { scope });
    await settleMicrotasks();
  });

  it("should return to idle and clear state on hangUp", async () => {
    const scope = fork();

    await startConnectedCall(scope);
    void allSettled(callModel.hangUp, { scope });
    await settleMicrotasks();

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(scope.getState(callModel.$incomingCall)).toBeNull();
    expect(scope.getState(callModel.$callId)).toBeNull();
    expect(scope.getState(callModel.$callDurationSeconds)).toBe(0);
  });

  it("should return to idle on rejectCall and cancelCall", async () => {
    const rejectScope = fork();
    await allSettled(callModel.incomingCallReceived, {
      scope: rejectScope,
      params: { callId: "c", callerName: "A", role: "tutor", lesson: null },
    });
    await allSettled(callModel.rejectCall, { scope: rejectScope });
    expect(rejectScope.getState(callModel.$callPhase)).toBe("idle");

    const cancelScope = fork();
    await allSettled(callModel.callStarted, {
      scope: cancelScope,
      params: { studentId: "s", peerName: "N", lesson: null },
    });
    await allSettled(callModel.cancelCall, { scope: cancelScope });
    expect(cancelScope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should return to idle on call_unavailable", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "s", peerName: "N", lesson: null },
    });
    await allSettled(callModel.unavailableReceived, { scope, params: "student" });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should be connecting, not active, once the callee accepts", async () => {
    const scope = fork();
    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-acc", callerName: "Анна", role: "tutor", lesson: null },
    });
    expect(scope.getState(callModel.$callPhase)).toBe("incoming");

    await allSettled(callModel.acceptCall, { scope });

    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
    expect(scope.getState(callModel.$isConnecting)).toBe(true);
  });

  it("should be connecting, not outgoing, once the callee answers the caller", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "s", peerName: "N", lesson: null },
    });

    await allSettled(callModel.callAcceptedReceived, {
      scope,
      params: { callId: "call-out", iceServers: [{ urls: "stun:example" }] },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("connecting");
    expect(scope.getState(callModel.$iceServers)).toEqual([{ urls: "stun:example" }]);
  });

  it("should send the hangup to the call's own socket and then forget the call", async () => {
    const byRole: Record<CallRole, CallSignalingInbound[]> = { tutor: [], student: [] };
    setCallTransport("tutor", (message) => byRole.tutor.push(message), "tutor-socket");
    setCallTransport("student", (message) => byRole.student.push(message), "student-socket");
    const scope = fork();
    await startConnectedCall(scope);
    const adapter = createFakeAdapter();
    // The duration timer keeps the scope busy, so allSettled would never resolve here.
    void allSettled(callModel.localMediaAttached, {
      scope,
      params: {
        localStream: adapter.createMediaStream(),
        remoteStream: adapter.createMediaStream(),
      },
    });
    await settleMicrotasks();
    expect(scope.getState(callModel.$remoteStream)).not.toBeNull();

    void allSettled(callModel.hangUp, { scope });
    await settleMicrotasks();

    expect(byRole.tutor).toContainEqual({ type: "call_hangup", callId: "call-1" });
    expect(byRole.student).toEqual([]);
    expect(scope.getState(callModel.$callAddress)).toBeNull();
    expect(scope.getState(callModel.$localStream)).toBeNull();
    expect(scope.getState(callModel.$remoteStream)).toBeNull();
  });

  it("should return to idle on canceledReceived", async () => {
    const scope = fork();
    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-cancel", callerName: "Анна", role: "tutor", lesson: null },
    });
    expect(scope.getState(callModel.$callPhase)).toBe("incoming");

    await allSettled(callModel.canceledReceived, {
      scope,
      params: { reason: "canceled", callerName: "Анна" },
    });
    expect(scope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should return to idle on busy and no-answer", async () => {
    const busyScope = fork();
    await allSettled(callModel.callStarted, {
      scope: busyScope,
      params: { studentId: "s", peerName: "N", lesson: null },
    });
    expect(busyScope.getState(callModel.$callPhase)).toBe("outgoing");
    await allSettled(callModel.busyReceived, { scope: busyScope });
    expect(busyScope.getState(callModel.$callPhase)).toBe("idle");

    const noAnswerScope = fork();
    await allSettled(callModel.callStarted, {
      scope: noAnswerScope,
      params: { studentId: "s", peerName: "N", lesson: null },
    });
    expect(noAnswerScope.getState(callModel.$callPhase)).toBe("outgoing");
    await allSettled(callModel.noAnswerReceived, { scope: noAnswerScope });
    expect(noAnswerScope.getState(callModel.$callPhase)).toBe("idle");
  });
});
