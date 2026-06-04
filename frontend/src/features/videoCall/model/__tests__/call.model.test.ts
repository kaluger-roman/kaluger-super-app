import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callModel, setCallTransport, stopAllSessions } from "../index";

const settleMicrotasks = () =>
  new Promise((resolve) => setImmediate(resolve));

const startConnectedCall = async (scope: Scope): Promise<void> => {
  await allSettled(callModel.incomingCallReceived, {
    scope,
    params: { callId: "call-1", callerName: "Анна" },
  });
  void allSettled(callModel.callConnected, { scope });
  await settleMicrotasks();
};

describe("features/videoCall/model/call.model transitions", () => {
  beforeEach(() => {
    setCallTransport(vi.fn());
  });

  afterEach(() => {
    stopAllSessions();
    setCallTransport(null);
  });

  it("should move to outgoing and set the peer on callStarted", async () => {
    const scope = fork();

    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "stu-1", peerName: "Иван Смирнов" },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("outgoing");
    expect(scope.getState(callModel.$outgoingCallPeer)).toEqual({
      id: "stu-1",
      name: "Иван Смирнов",
      role: "student",
    });
  });

  it("should move to incoming and store the caller on incomingCallReceived", async () => {
    const scope = fork();

    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-1", callerName: "Анна Петрова" },
    });

    expect(scope.getState(callModel.$callPhase)).toBe("incoming");
    expect(scope.getState(callModel.$incomingCall)).toEqual({
      callId: "call-1",
      callerName: "Анна Петрова",
    });
  });

  it("should move to active on callConnected", async () => {
    const scope = fork();

    await startConnectedCall(scope);

    expect(scope.getState(callModel.$callPhase)).toBe("active");
    expect(scope.getState(callModel.$callStatusMessage)).toBeNull();

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
      params: { callId: "c", callerName: "A" },
    });
    await allSettled(callModel.rejectCall, { scope: rejectScope });
    expect(rejectScope.getState(callModel.$callPhase)).toBe("idle");

    const cancelScope = fork();
    await allSettled(callModel.callStarted, {
      scope: cancelScope,
      params: { studentId: "s", peerName: "N" },
    });
    await allSettled(callModel.cancelCall, { scope: cancelScope });
    expect(cancelScope.getState(callModel.$callPhase)).toBe("idle");
  });

  it("should show the offline message and mark the peer offline on call_unavailable", async () => {
    const scope = fork();
    await allSettled(callModel.callStarted, {
      scope,
      params: { studentId: "s", peerName: "N" },
    });
    await allSettled(callModel.unavailableReceived, { scope });

    expect(scope.getState(callModel.$callPhase)).toBe("idle");
    expect(scope.getState(callModel.$callStatusMessage)).toEqual({
      kind: "error",
      text: "Собеседник сейчас не в сети",
    });
  });

  it("leaves the incoming phase and shows a connecting status when the callee accepts", async () => {
    const scope = fork();
    await allSettled(callModel.incomingCallReceived, {
      scope,
      params: { callId: "call-acc", callerName: "Анна" },
    });
    expect(scope.getState(callModel.$callPhase)).toBe("incoming");

    await allSettled(callModel.acceptCall, { scope });

    expect(scope.getState(callModel.$callPhase)).toBe("active");
    expect(scope.getState(callModel.$callStatusMessage)).toEqual({
      kind: "info",
      text: "Соединение…",
    });
  });

  it("should show the busy and no-answer messages", async () => {
    const busyScope = fork();
    await allSettled(callModel.busyReceived, { scope: busyScope });
    expect(busyScope.getState(callModel.$callStatusMessage)).toEqual({
      kind: "error",
      text: "Абонент занят",
    });

    const noAnswerScope = fork();
    await allSettled(callModel.noAnswerReceived, { scope: noAnswerScope });
    expect(noAnswerScope.getState(callModel.$callStatusMessage)).toEqual({
      kind: "error",
      text: "Нет ответа",
    });
  });
});
