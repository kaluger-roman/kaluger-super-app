import { createWatch } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callModel } from "@features/videoCall";
import {
  resetCallTransportsForTests,
  setWebRtcAdapter,
  stopAllSessions,
} from "@features/videoCall/testSeams.helpers";

import { connectStudentWebSocket, disconnectStudentWebSocket } from "../studentWebSocket.model";
import { connectWebSocket, disconnectWebSocket } from "../webSocket.model";

let sockets: MockWebSocket[] = [];

class MockWebSocket {
  send = vi.fn();
  close = vi.fn();
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readyState = 1;

  constructor() {
    sockets.push(this);
  }
}

const idleAdapter = {
  createPeerConnection: vi.fn(),
  getUserMedia: vi.fn(),
  getDisplayMedia: vi.fn(),
  createMediaStream: vi.fn(),
  supportsDisplayMedia: vi.fn(() => true),
};

const incoming = (callId: string) =>
  JSON.stringify({ type: "call_incoming", callId, callerName: "Анна", iceServers: [] });

describe.each([
  {
    role: "tutor",
    tokenKey: "authToken",
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
  },
  {
    role: "student",
    tokenKey: "studentToken",
    connect: connectStudentWebSocket,
    disconnect: disconnectStudentWebSocket,
  },
])("app/model $role socket call wiring", ({ tokenKey, connect, disconnect }) => {
  beforeEach(() => {
    sockets = [];
    localStorage.setItem(tokenKey, "test-token");
    vi.stubGlobal("WebSocket", MockWebSocket);
    setWebRtcAdapter(idleAdapter);
  });

  afterEach(() => {
    callModel.hangUp();
    disconnect();
    stopAllSessions();
    resetCallTransportsForTests();
    vi.unstubAllGlobals();
    localStorage.removeItem(tokenKey);
  });

  const openSocket = (): MockWebSocket => {
    connect();
    const socket = sockets[sockets.length - 1];
    socket.onopen?.();
    return socket;
  };

  const watchPhases = () => {
    const phases: string[] = [];
    const unwatch = createWatch({ unit: callModel.$callPhase, fn: (phase) => phases.push(phase) });
    return { phases, unwatch };
  };

  it("should route call signals from the socket into the call model", () => {
    const socket = openSocket();
    const { phases, unwatch } = watchPhases();

    socket.onmessage?.({ data: incoming("c-1") });
    unwatch();

    expect(phases).toContain("incoming");
  });

  it("should drop a malformed call signal", () => {
    const socket = openSocket();
    const { phases, unwatch } = watchPhases();

    socket.onmessage?.({ data: JSON.stringify({ type: "call_incoming", callId: "c-x" }) });
    unwatch();

    expect(phases).not.toContain("incoming");
  });

  it("should send call answers back through the same socket", () => {
    const socket = openSocket();
    socket.onmessage?.({ data: incoming("c-2") });

    callModel.rejectCall();

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "call_reject", callId: "c-2" })
    );
  });

  it("should end the call when the socket closes", () => {
    const socket = openSocket();
    socket.onmessage?.({ data: incoming("c-3") });
    const { phases, unwatch } = watchPhases();

    socket.onclose?.({ code: 1006 });
    unwatch();

    expect(phases).toContain("idle");
  });
});
