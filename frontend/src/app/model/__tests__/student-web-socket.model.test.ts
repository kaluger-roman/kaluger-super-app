import { fork, allSettled } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  $studentWebSocketConnection,
  connectStudentWebSocket,
  disconnectStudentWebSocket,
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
