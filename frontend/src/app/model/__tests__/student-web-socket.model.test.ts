import { fork, allSettled } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STUDENT_WS_RECONNECT_DELAY_MS } from "../student-web-socket.constants";
import {
  $studentWebSocketConnection,
  connectStudentWebSocket,
  disconnectStudentWebSocket,
  studentWebSocketClosed,
} from "../student-web-socket.model";

const STUDENT_TOKEN_KEY = "studentToken";

type MockWebSocket = {
  url: string;
  readyState: number;
  close: ReturnType<typeof vi.fn>;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

let createdSockets: MockWebSocket[] = [];

class MockWebSocketCtor {
  url: string;
  readyState = 0;
  close: ReturnType<typeof vi.fn>;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.close = vi.fn(() => {
      this.readyState = 3;
    });
    createdSockets.push(this as unknown as MockWebSocket);
  }
}

beforeEach(() => {
  createdSockets = [];
  localStorage.setItem(STUDENT_TOKEN_KEY, "test-student-token");
  vi.stubGlobal("WebSocket", MockWebSocketCtor);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.removeItem(STUDENT_TOKEN_KEY);
});

describe("app/model/student-web-socket.model — disconnect race", () => {
  it("stores the WebSocket synchronously so an early disconnect closes the still-opening socket (regression: orphaned WS before onopen)", async () => {
    const scope = fork();

    await allSettled(connectStudentWebSocket, { scope });

    // Connection store must be populated BEFORE onopen fires — иначе ранний
    // disconnect (быстрый logout) увидит null и сокет останется в handshake.
    const stored = scope.getState($studentWebSocketConnection);
    expect(stored).not.toBeNull();
    expect(createdSockets).toHaveLength(1);
    expect(createdSockets[0].onopen).toBeTypeOf("function");

    // onopen ещё не вызван — disconnect должен всё равно закрыть сокет.
    await allSettled(disconnectStudentWebSocket, { scope });

    expect(createdSockets[0].close).toHaveBeenCalledTimes(1);
  });
});

// The reconnect delay lives in patronum's `delay`, whose internal effect stays
// pending until the timer fires — `allSettled` calls that schedule a reconnect
// are fire-and-forget, and the clock is driven explicitly.
describe("app/model/student-web-socket.model — reconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reconnects after the delay while the session is still enabled", async () => {
    const scope = fork();

    await allSettled(connectStudentWebSocket, { scope });
    expect(createdSockets).toHaveLength(1);

    const closeRun = allSettled(studentWebSocketClosed, { scope });

    await vi.advanceTimersByTimeAsync(STUDENT_WS_RECONNECT_DELAY_MS - 1);
    expect(createdSockets).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    await closeRun;

    expect(createdSockets).toHaveLength(2);
  });

  it("collapses repeated close events into a single scheduled reconnect", async () => {
    const scope = fork();

    await allSettled(connectStudentWebSocket, { scope });

    const closeRuns = [
      allSettled(studentWebSocketClosed, { scope }),
      allSettled(studentWebSocketClosed, { scope }),
    ];
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(STUDENT_WS_RECONNECT_DELAY_MS);
    await Promise.all(closeRuns);

    expect(createdSockets).toHaveLength(2);
  });

  it("does NOT reconnect when the session was disconnected before the delay passed", async () => {
    const scope = fork();

    await allSettled(connectStudentWebSocket, { scope });

    const closeRun = allSettled(studentWebSocketClosed, { scope });
    const disconnectRun = allSettled(disconnectStudentWebSocket, { scope });

    await vi.advanceTimersByTimeAsync(STUDENT_WS_RECONNECT_DELAY_MS);
    await Promise.all([closeRun, disconnectRun]);

    expect(createdSockets).toHaveLength(1);
  });

  it("does NOT open a second socket when the cabinet is left and re-entered inside the reconnect delay (regression: stale delay after re-login)", async () => {
    const scope = fork();

    await allSettled(connectStudentWebSocket, { scope });

    const runs = [
      allSettled(studentWebSocketClosed, { scope }),
      allSettled(disconnectStudentWebSocket, { scope }),
      allSettled(connectStudentWebSocket, { scope }),
    ];
    expect(createdSockets).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(STUDENT_WS_RECONNECT_DELAY_MS);
    await Promise.all(runs);

    expect(createdSockets).toHaveLength(2);
  });

  it("still reconnects after a close that follows re-entering while a stale delay is pending (regression: stale delay swallowing the next reconnect)", async () => {
    const scope = fork();

    await allSettled(connectStudentWebSocket, { scope });

    const runs = [
      allSettled(studentWebSocketClosed, { scope }),
      allSettled(disconnectStudentWebSocket, { scope }),
      allSettled(connectStudentWebSocket, { scope }),
      allSettled(studentWebSocketClosed, { scope }),
    ];
    expect(createdSockets).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(2);

    await vi.advanceTimersByTimeAsync(STUDENT_WS_RECONNECT_DELAY_MS);
    await Promise.all(runs);

    expect(createdSockets).toHaveLength(3);
  });
});
