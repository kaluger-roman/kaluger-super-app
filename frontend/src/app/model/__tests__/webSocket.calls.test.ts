import { createEvent, createWatch, sample } from "effector";
import type { Store } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callModel, callResumeModel } from "@features/videoCall";
import {
  resetCallTransportsForTests,
  setWebRtcAdapter,
  stopAllSessions,
} from "@features/videoCall/testSeams.helpers";

import * as appInitModel from "../appInit.model";
import "../sessionLogout.model";
import * as studentWebSocketModel from "../studentWebSocket.model";
import * as webSocketModel from "../webSocket.model";

// The real tutor session expiry sends the window to /login, which would outlive the test.
vi.mock("@shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@shared")>();
  return { ...actual, expireTutorSession: vi.fn() };
});

let sockets: MockWebSocket[] = [];

const readStore = <T>(store: Store<T>): T => {
  const probe = createEvent();
  const values: T[] = [];
  const unwatch = createWatch({
    unit: sample({ clock: probe, source: store }),
    fn: (value) => values.push(value),
  });
  probe();
  unwatch();
  return values[0];
};

class MockWebSocket {
  url: string;
  send = vi.fn();
  close = vi.fn();
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readyState = 1;

  constructor(url: string) {
    this.url = url;
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

const CONNECTION_READY = JSON.stringify({ type: "connection_ready" });

const incoming = (callId: string) =>
  JSON.stringify({ type: "call_incoming", callId, callerName: "Анна", iceServers: [] });

const callState = (callId: string | null) =>
  JSON.stringify({
    type: "call_state",
    call: callId && {
      callId,
      status: "ringing",
      direction: "incoming",
      peerName: "Анна",
      lesson: null,
      iceServers: [],
      peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
      connectedAt: null,
    },
  });

// Longer than the wait for call_state that tells a dead socket.
const PAST_REPLY_TIMEOUT_MS = 10_000;

describe.each([
  {
    role: "tutor",
    tokenKey: "authToken",
    connect: webSocketModel.connectWebSocket,
    disconnect: webSocketModel.disconnectWebSocket,
    tokenStorageChanged: webSocketModel.tokenStorageChanged,
  },
  {
    role: "student",
    tokenKey: "studentToken",
    connect: studentWebSocketModel.connectStudentWebSocket,
    disconnect: studentWebSocketModel.disconnectStudentWebSocket,
    tokenStorageChanged: studentWebSocketModel.tokenStorageChanged,
  },
])(
  "app/model $role socket call wiring",
  ({ tokenKey, connect, disconnect, tokenStorageChanged }) => {
    beforeEach(() => {
      sockets = [];
      localStorage.setItem(tokenKey, "test-token");
      vi.stubGlobal("WebSocket", MockWebSocket);
      setWebRtcAdapter(idleAdapter);
    });

    afterEach(() => {
      callModel.hangUp();
      disconnect();
      sockets.forEach((socket) => socket.onclose?.({ code: 1000 }));
      stopAllSessions();
      resetCallTransportsForTests();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      localStorage.removeItem(tokenKey);
    });

    const openSocket = (): MockWebSocket => {
      connect();
      const socket = sockets[sockets.length - 1];
      socket.onopen?.();
      socket.onmessage?.({ data: CONNECTION_READY });
      return socket;
    };

    const watchPhases = () => {
      const phases: string[] = [];
      const unwatch = createWatch({
        unit: callModel.$callPhase,
        fn: (phase) => phases.push(phase),
      });
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

    it("should not send call signals over a socket the server has not registered yet", () => {
      connect();
      const socket = sockets[sockets.length - 1];
      socket.onopen?.();
      socket.onmessage?.({ data: incoming("c-unready") });

      callModel.rejectCall();

      expect(socket.send).not.toHaveBeenCalled();
    });

    it("should keep the call when the socket closes (039: the server holds it)", () => {
      const socket = openSocket();
      socket.onmessage?.({ data: incoming("c-3") });
      const { phases, unwatch } = watchPhases();

      socket.onclose?.({ code: 1006 });
      unwatch();

      expect(phases).not.toContain("idle");
      expect(readStore(callModel.$callId)).toBe("c-3");
      expect(readStore(callResumeModel.$isOwnTransportLost)).toBe(true);
    });

    it("should drop a ringing call without signals when a page opened from its notification takes the connection (regression: incoming screen kept for 190 s)", () => {
      const socket = openSocket();
      socket.onmessage?.({ data: incoming("c-6") });
      socket.send.mockClear();

      socket.onclose?.({ code: 4000 });

      expect(readStore(callModel.$callPhase)).toBe("idle");
      expect(readStore(callResumeModel.$isOwnTransportLost)).toBe(false);
      expect(socket.send).not.toHaveBeenCalled();
    });

    it("should drop a ringing call when the reconnect is refused because another page holds the connection", () => {
      const socket = openSocket();
      socket.onmessage?.({ data: incoming("c-7") });
      socket.onclose?.({ code: 1006 });
      appInitModel.onlineStatusChanged(true);
      const next = sockets[sockets.length - 1];

      next.onclose?.({ code: 4000 });

      expect(readStore(callModel.$callPhase)).toBe("idle");
      expect(readStore(callResumeModel.$isOwnTransportLost)).toBe(false);
      expect(next.send).not.toHaveBeenCalled();
    });

    it("should connect without resume when the incoming call notification is tapped in a running app", () => {
      const socket = openSocket();
      socket.onclose?.({ code: 4000 });

      appInitModel.serviceWorkerMessaged({ type: "call_notification_opened", callId: "c-8" });

      const next = sockets[sockets.length - 1];
      expect(next).not.toBe(socket);
      expect(new URL(next.url).searchParams.get("resume")).toBeNull();
      next.onopen?.();
      next.onmessage?.({ data: CONNECTION_READY });
      next.onmessage?.({ data: callState("c-8") });
      expect(readStore(callModel.$callPhase)).toBe("incoming");
    });

    it("should reopen a sleeping socket without resume when the call of a tapped notification does not come (regression: «Использовать здесь» instead of the incoming call)", async () => {
      vi.useFakeTimers();
      const socket = openSocket();

      appInitModel.serviceWorkerMessaged({ type: "call_notification_opened", callId: "c-9" });
      expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: "call_sync" }));
      expect(sockets[sockets.length - 1]).toBe(socket);
      await vi.advanceTimersByTimeAsync(PAST_REPLY_TIMEOUT_MS);

      const next = sockets[sockets.length - 1];
      expect(next).not.toBe(socket);
      expect(socket.close).toHaveBeenCalled();
      expect(new URL(next.url).searchParams.get("resume")).toBeNull();
      next.onopen?.();
      next.onmessage?.({ data: CONNECTION_READY });
      expect(next.send).toHaveBeenCalledWith(JSON.stringify({ type: "call_sync" }));
      next.onmessage?.({ data: callState("c-9") });
      expect(readStore(callModel.$callPhase)).toBe("incoming");
      vi.useRealTimers();
    });

    it("should end the call over its socket when another tab logged out", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const socket = openSocket();
      socket.onmessage?.({ data: incoming("c-5") });
      localStorage.removeItem(tokenKey);

      tokenStorageChanged();
      await new Promise((resolve) => setImmediate(resolve));

      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "call_reject", callId: "c-5" })
      );
      expect(readStore(callModel.$callPhase)).toBe("idle");
    });

    it("should report presence and ask for the call on the new socket, then drop a call the server no longer has", () => {
      const socket = openSocket();
      socket.onmessage?.({ data: incoming("c-4") });
      socket.onclose?.({ code: 1006 });

      appInitModel.onlineStatusChanged(true);
      const next = sockets[sockets.length - 1];
      expect(next).not.toBe(socket);
      next.onopen?.();
      next.onmessage?.({ data: CONNECTION_READY });

      expect(next.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "presence_update",
          presence: "on_screen",
          audioSuspended: false,
          videoSuspended: false,
        })
      );
      expect(next.send).toHaveBeenCalledWith(JSON.stringify({ type: "call_sync" }));
      expect(readStore(callResumeModel.$isOwnTransportLost)).toBe(false);

      next.send.mockClear();
      next.onmessage?.({ data: JSON.stringify({ type: "call_state", call: null }) });

      expect(readStore(callModel.$callPhase)).toBe("idle");
      expect(next.send).not.toHaveBeenCalled();
    });
  }
);
