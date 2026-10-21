import { allSettled, createEvent, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSocketConnection } from "../socketConnection.model";
import {
  CALL_ELSEWHERE_RETRY_DELAY_MS,
  HIDDEN_TAB_RECONNECT_DELAY_MS,
} from "../webSocket.constants";

const RECONNECT_DELAY_MS = 1000;
const CONNECTION_READY = JSON.stringify({ type: "connection_ready" });
const PLAIN_CLOSE = { revokedToken: null, elsewhere: null };

class MockWebSocket {
  url: string;
  send = vi.fn();
  close = vi.fn();
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    sockets.push(this);
  }

  ready() {
    this.onopen?.();
    this.onmessage?.({ data: CONNECTION_READY });
  }

  get query() {
    return new URL(this.url).searchParams;
  }
}

let sockets: MockWebSocket[] = [];
let token: string | null = "token-1";

const resumed = createEvent();
const dispatch = vi.fn();
const canResume = vi.fn((_revokedToken: string | null) => true);
const connection = createSocketConnection({
  path: "/ws/test",
  role: "tutor",
  getToken: () => token,
  dispatch,
  reconnectDelayMs: RECONNECT_DELAY_MS,
  resumed,
  logLabel: "Test WS",
  revokedCloseCodes: new Set([4001]),
  canResume,
});

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
};

// patronum `delay` keeps the scope busy until its timer fires, so units are launched
// fire-and-forget and the clock is driven explicitly.
const launch = async (scope: Scope, run: () => unknown) => {
  void run();
  await vi.advanceTimersByTimeAsync(0);
};

const connectReady = async (scope: Scope): Promise<MockWebSocket> => {
  await launch(scope, () => allSettled(connection.connect, { scope }));
  const socket = sockets[sockets.length - 1];
  socket.ready();
  await vi.advanceTimersByTimeAsync(0);
  return socket;
};

const closeSocket = async (socket: MockWebSocket, code: number) => {
  socket.onclose?.({ code });
  await vi.advanceTimersByTimeAsync(0);
};

beforeEach(() => {
  sockets = [];
  token = "token-1";
  canResume.mockReset();
  dispatch.mockClear();
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  setVisibility("visible");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("app/model/socketConnection.model — handshake", () => {
  it("should name the tab and resume only on automatic reconnects", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 1006);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(first.query.get("resume")).toBeNull();
    expect(sockets[1].query.get("resume")).toBe("1");
    expect(first.query.get("tab")).toMatch(/^[A-Za-z0-9-]{1,64}$/);
    expect(sockets[1].query.get("tab")).toBe(first.query.get("tab"));
    expect(first.query.get("token")).toBe("token-1");
  });

  it("should count the socket as connected only once the server registered it", async () => {
    const scope = fork();
    await launch(scope, () => allSettled(connection.connect, { scope }));
    sockets[0].onopen?.();

    expect(scope.getState(connection.$isConnected)).toBe(false);
    sockets[0].onmessage?.({ data: CONNECTION_READY });
    expect(scope.getState(connection.$isConnected)).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();

    sockets[0].onmessage?.({ data: '{"type":"lesson_deleted"}' });
    expect(dispatch).toHaveBeenCalledWith('{"type":"lesson_deleted"}');
  });

  it("should keep the elsewhere state steady while a retry is refused", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);
    const seen: unknown[] = [];
    const watcher = createWatch({ unit: connection.$elsewhere, fn: (v) => seen.push(v), scope });

    await launch(scope, () => allSettled(resumed, { scope }));
    sockets[1].onopen?.();
    await closeSocket(sockets[1], 4000);
    watcher.unsubscribe();

    expect(scope.getState(connection.$elsewhere)).toBe("tab");
    expect(seen).not.toContain(null);
  });

  it("should close a still-opening socket on an early disconnect", async () => {
    const scope = fork();
    await launch(scope, () => allSettled(connection.connect, { scope }));

    await launch(scope, () => allSettled(connection.disconnect, { scope }));

    expect(sockets[0].close).toHaveBeenCalledTimes(1);
  });
});

describe("app/model/socketConnection.model — replaced sockets", () => {
  it("should close the previous socket and ignore its late close on a repeated take-over", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);

    await launch(scope, () => allSettled(connection.connect, { scope }));
    await launch(scope, () => allSettled(connection.connect, { scope }));
    const [, second, third] = sockets;
    expect(second.close).toHaveBeenCalledTimes(1);

    third.ready();
    await closeSocket(second, 4000);

    expect(scope.getState(connection.$connection)).toBe(third);
    expect(scope.getState(connection.$isConnected)).toBe(true);
    expect(scope.getState(connection.$elsewhere)).toBeNull();
  });

  it("should not let a replaced socket take the connection back", async () => {
    const scope = fork();
    await launch(scope, () => allSettled(connection.connect, { scope }));
    await launch(scope, () => allSettled(connection.connect, { scope }));
    const [first, second] = sockets;

    first.onmessage?.({ data: CONNECTION_READY });

    expect(scope.getState(connection.$connection)).toBe(second);
    expect(scope.getState(connection.$isConnected)).toBe(false);
  });
});

describe("app/model/socketConnection.model — reconnect", () => {
  it("should collapse repeated closes into one reconnect", async () => {
    const scope = fork();
    await connectReady(scope);

    await launch(scope, () => allSettled(connection.closed, { scope, params: PLAIN_CLOSE }));
    await launch(scope, () => allSettled(connection.closed, { scope, params: PLAIN_CLOSE }));
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(sockets).toHaveLength(2);
  });

  it("should not reconnect after a logout and login inside the delay", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await closeSocket(first, 1006);
    await launch(scope, () => allSettled(connection.disconnect, { scope }));
    await launch(scope, () => allSettled(connection.connect, { scope }));
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(sockets).toHaveLength(2);
  });

  it("should stop reconnecting when the session can no longer resume", async () => {
    canResume.mockReturnValue(false);
    const scope = fork();
    const first = await connectReady(scope);

    await closeSocket(first, 4001);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(canResume).toHaveBeenCalledWith("token-1");
    expect(sockets).toHaveLength(1);
  });

  it("should reconnect at once when the revoked token was already replaced", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    token = "token-2";

    await closeSocket(first, 4001);

    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("token")).toBe("token-2");
  });
});

describe("app/model/socketConnection.model — hidden tab", () => {
  it("should let a hidden tab yield first, then reconnect on its own", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    setVisibility("hidden");

    await closeSocket(first, 1006);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);
    expect(sockets).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(HIDDEN_TAB_RECONNECT_DELAY_MS);
    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");
  });

  it("should reconnect a deferred hidden tab as soon as it is shown", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    setVisibility("hidden");
    await closeSocket(first, 1006);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    setVisibility("visible");
    await launch(scope, () => allSettled(resumed, { scope }));
    expect(sockets).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(HIDDEN_TAB_RECONNECT_DELAY_MS);
    expect(sockets).toHaveLength(2);
  });
});

describe("app/model/socketConnection.model — held elsewhere", () => {
  it("should not reconnect by itself when another tab took the connection", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await closeSocket(first, 4000);
    await vi.advanceTimersByTimeAsync(CALL_ELSEWHERE_RETRY_DELAY_MS + RECONNECT_DELAY_MS);

    expect(sockets).toHaveLength(1);
    expect(scope.getState(connection.$elsewhere)).toBe("tab");
  });

  it("should keep asking while another tab is in a call and stop once it ends", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await closeSocket(first, 4002);
    expect(scope.getState(connection.$elsewhere)).toBe("call");
    await vi.advanceTimersByTimeAsync(CALL_ELSEWHERE_RETRY_DELAY_MS);
    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");

    await closeSocket(sockets[1], 4000);
    await vi.advanceTimersByTimeAsync(CALL_ELSEWHERE_RETRY_DELAY_MS * 2);

    expect(sockets).toHaveLength(2);
    expect(scope.getState(connection.$elsewhere)).toBe("tab");
  });

  it("should retry at once when the token changes while the connection is held elsewhere", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);
    token = "token-2";

    await launch(scope, () => allSettled(connection.tokenRenewed, { scope }));

    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");
  });

  it("should retry when the user comes back to a tab held elsewhere", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);

    await launch(scope, () => allSettled(resumed, { scope }));
    sockets[1].ready();

    expect(scope.getState(connection.$elsewhere)).toBeNull();
    expect(scope.getState(connection.$isConnected)).toBe(true);
  });
});
