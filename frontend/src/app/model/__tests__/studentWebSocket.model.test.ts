import { fork, allSettled, createWatch } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { studentUserModel } from "@entities";

import { STUDENT_WS_RECONNECT_DELAY_MS } from "../studentWebSocket.constants";
import {
  $elsewhere,
  $isStudentWebSocketConnected,
  $studentWebSocketConnection,
  connectStudentWebSocket,
  disconnectStudentWebSocket,
  tokenStorageChanged,
} from "../studentWebSocket.model";

// The generic reconnect flow is covered in socketConnection.model.test.ts; these tests pin
// that the student socket is wired into it.
const STUDENT_TOKEN_KEY = "studentToken";

class MockWebSocket {
  url: string;
  close = vi.fn();
  send = vi.fn();
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    createdSockets.push(this);
  }
}

let createdSockets: MockWebSocket[] = [];

const urlOf = (socket: MockWebSocket) => new URL(socket.url);

beforeEach(() => {
  createdSockets = [];
  localStorage.setItem(STUDENT_TOKEN_KEY, "test-student-token");
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem(STUDENT_TOKEN_KEY);
});

describe("app/model/studentWebSocket.model", () => {
  it("stores the WebSocket synchronously so an early disconnect closes the still-opening socket (regression: orphaned WS before onopen)", async () => {
    const scope = fork();

    await allSettled(connectStudentWebSocket, { scope });
    expect(scope.getState($studentWebSocketConnection)).toBe(createdSockets[0]);

    await allSettled(disconnectStudentWebSocket, { scope });

    expect(createdSockets[0].close).toHaveBeenCalledTimes(1);
  });

  it("opens the student socket and counts it connected once the server registered it", async () => {
    const scope = fork();
    await allSettled(connectStudentWebSocket, { scope });
    const [socket] = createdSockets;

    socket.onopen?.();
    expect(scope.getState($isStudentWebSocketConnected)).toBe(false);
    socket.onmessage?.({ data: JSON.stringify({ type: "connection_ready" }) });

    expect(urlOf(socket).pathname).toBe("/ws/student");
    expect(urlOf(socket).searchParams.get("resume")).toBeNull();
    expect(scope.getState($isStudentWebSocketConnected)).toBe(true);
  });

  it("reconnects as a resume after the delay", async () => {
    const scope = fork();
    await allSettled(connectStudentWebSocket, { scope });

    createdSockets[0].onclose?.({ code: 1006 });
    await vi.advanceTimersByTimeAsync(STUDENT_WS_RECONNECT_DELAY_MS);

    expect(createdSockets).toHaveLength(2);
    expect(urlOf(createdSockets[1]).searchParams.get("resume")).toBe("1");
  });

  it("waits on the open socket while a call goes on in another tab", async () => {
    const scope = fork();
    await allSettled(connectStudentWebSocket, { scope });

    createdSockets[0].onmessage?.({
      data: JSON.stringify({ type: "connection_waiting", reason: "call" }),
    });
    await vi.advanceTimersByTimeAsync(STUDENT_WS_RECONNECT_DELAY_MS);

    expect(scope.getState($elsewhere)).toBe("call");
    expect(createdSockets).toHaveLength(1);
  });

  it("logs out together with the holder tab when another tab removed the student token", async () => {
    const scope = fork();
    await allSettled(connectStudentWebSocket, { scope });
    const ended: unknown[] = [];
    createWatch({
      unit: studentUserModel.studentSessionEndedElsewhere,
      fn: () => ended.push(1),
      scope,
    });
    localStorage.removeItem(STUDENT_TOKEN_KEY);

    await allSettled(tokenStorageChanged, { scope });

    expect(ended).toHaveLength(1);
  });

  it("leaves a tab without a student session alone", async () => {
    const scope = fork();
    const ended: unknown[] = [];
    createWatch({
      unit: studentUserModel.studentSessionEndedElsewhere,
      fn: () => ended.push(1),
      scope,
    });
    localStorage.removeItem(STUDENT_TOKEN_KEY);

    await allSettled(tokenStorageChanged, { scope });

    expect(ended).toHaveLength(0);
  });
});
