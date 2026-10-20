import { createWatch } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callModel,
  setCallTransport,
  setWebRtcAdapter,
  stopAllSessions,
} from "@features/videoCall";

import { connectStudentWebSocket, disconnectStudentWebSocket } from "../studentWebSocket.model";

type MockSocket = {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

let sockets: MockSocket[] = [];

class MockWebSocketCtor {
  send = vi.fn();
  close = vi.fn();
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readyState = 1;

  constructor() {
    sockets.push(this as unknown as MockSocket);
  }
}

const fakeAdapter = {
  createPeerConnection: vi.fn(),
  getUserMedia: vi.fn(),
  getDisplayMedia: vi.fn(),
  createMediaStream: vi.fn(),
  supportsDisplayMedia: vi.fn(() => true),
};

describe("app/model/studentWebSocket.model call wiring", () => {
  beforeEach(() => {
    sockets = [];
    localStorage.setItem("studentToken", "test-student-token");
    vi.stubGlobal("WebSocket", MockWebSocketCtor);
    setWebRtcAdapter(fakeAdapter);
  });

  afterEach(() => {
    callModel.hangUp();
    disconnectStudentWebSocket();
    stopAllSessions();
    setCallTransport(null);
    vi.unstubAllGlobals();
    localStorage.removeItem("studentToken");
  });

  const openSocket = (): MockSocket => {
    connectStudentWebSocket();
    const socket = sockets[sockets.length - 1];
    socket.onopen?.();
    return socket;
  };

  it("should route call signals from the student socket into the call model", () => {
    const socket = openSocket();
    const phases: string[] = [];
    const unwatch = createWatch({ unit: callModel.$callPhase, fn: (phase) => phases.push(phase) });

    socket.onmessage?.({
      data: JSON.stringify({
        type: "call_incoming",
        callId: "c-1",
        callerName: "Анна",
        iceServers: [],
      }),
    });
    unwatch();

    expect(phases).toContain("incoming");
  });

  it("should send call answers back through the student socket", () => {
    const socket = openSocket();
    socket.onmessage?.({
      data: JSON.stringify({
        type: "call_incoming",
        callId: "c-2",
        callerName: "Анна",
        iceServers: [],
      }),
    });

    callModel.rejectCall();

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "call_reject", callId: "c-2" })
    );
  });

  it("should end the call when the student socket closes", () => {
    const socket = openSocket();
    socket.onmessage?.({
      data: JSON.stringify({
        type: "call_incoming",
        callId: "c-3",
        callerName: "Анна",
        iceServers: [],
      }),
    });
    const phases: string[] = [];
    const unwatch = createWatch({ unit: callModel.$callPhase, fn: (phase) => phases.push(phase) });

    socket.onclose?.();
    unwatch();

    expect(phases).toContain("idle");
  });
});
