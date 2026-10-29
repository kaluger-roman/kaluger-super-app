import { allSettled, createEvent, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callNotificationOpenModel, callPresenceModel, callResumeModel } from "@features/videoCall";

import { createSocketConnection } from "../socketConnection.model";

const RECONNECT_DELAY_MS = 1000;
const CONNECTION_READY = JSON.stringify({ type: "connection_ready" });
const CONNECTION_WAITING = JSON.stringify({ type: "connection_waiting", reason: "call" });
const PLAIN_CLOSE = { revokedToken: null, elsewhere: null, callEnded: false, holderGone: false };

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
const online = createEvent();
const openedForCall = createEvent();
const dispatch = vi.fn();
const canResume = vi.fn((_revokedToken: string | null) => true);
const connection = createSocketConnection({
  path: "/ws/test",
  role: "tutor",
  getToken: () => token,
  dispatch,
  reconnectDelayMs: RECONNECT_DELAY_MS,
  resumed,
  online,
  openedForCall,
  logLabel: "Test WS",
  revokedCloseCodes: new Set([4001]),
  canResume,
});

// patronum `delay` keeps the scope busy until its timer fires, so units are launched
// fire-and-forget and the clock is driven explicitly.
const launch = async (run: () => unknown) => {
  void run();
  await vi.advanceTimersByTimeAsync(0);
};

const connectReady = async (scope: Scope): Promise<MockWebSocket> => {
  await launch(() => allSettled(connection.connect, { scope }));
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
    expect(sockets[1].query.get("tab")).toBe(first.query.get("tab"));
    expect(first.query.get("token")).toBe("token-1");
  });

  it("should count the socket as connected only once the server registered it", async () => {
    const scope = fork();
    await launch(() => allSettled(connection.connect, { scope }));
    sockets[0].onopen?.();

    expect(scope.getState(connection.$isConnected)).toBe(false);
    sockets[0].onmessage?.({ data: CONNECTION_READY });
    expect(scope.getState(connection.$isConnected)).toBe(true);
    expect(dispatch).not.toHaveBeenCalled();

    sockets[0].onmessage?.({ data: '{"type":"lesson_deleted"}' });
    expect(dispatch).toHaveBeenCalledWith({ type: "lesson_deleted" });
  });

  it("should keep the elsewhere state steady while a retry is refused", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);
    const seen: unknown[] = [];
    const watcher = createWatch({ unit: connection.$elsewhere, fn: (v) => seen.push(v), scope });

    await launch(() => allSettled(resumed, { scope }));
    sockets[1].onopen?.();
    await closeSocket(sockets[1], 4000);
    watcher.unsubscribe();

    expect(scope.getState(connection.$elsewhere)).toBe("tab");
    expect(seen).not.toContain(null);
  });

  it("should close a still-opening socket on an early disconnect", async () => {
    const scope = fork();
    await launch(() => allSettled(connection.connect, { scope }));

    await launch(() => allSettled(connection.disconnect, { scope }));

    expect(sockets[0].close).toHaveBeenCalledTimes(1);
  });
});

describe("app/model/socketConnection.model — replaced sockets", () => {
  it("should close the previous socket and ignore its late close on a repeated take-over", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);

    await launch(() => allSettled(connection.connect, { scope }));
    await launch(() => allSettled(connection.connect, { scope }));
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
    await launch(() => allSettled(connection.connect, { scope }));
    await launch(() => allSettled(connection.connect, { scope }));
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

    await launch(() => allSettled(connection.closed, { scope, params: PLAIN_CLOSE }));
    await launch(() => allSettled(connection.closed, { scope, params: PLAIN_CLOSE }));
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(sockets).toHaveLength(2);
  });

  it("should schedule a fresh reconnect after the previous one has fired (regression: one reconnect per page)", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await closeSocket(first, 1006);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);
    await closeSocket(sockets[1], 1006);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(sockets).toHaveLength(3);
  });

  it("should not reconnect after a logout and login inside the delay", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await closeSocket(first, 1006);
    await launch(() => allSettled(connection.disconnect, { scope }));
    await launch(() => allSettled(connection.connect, { scope }));
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(sockets).toHaveLength(2);
  });

  it("should still reconnect after a close that follows re-login while a stale delay is pending (regression: stale delay swallowing the next reconnect)", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await closeSocket(first, 1006);
    await launch(() => allSettled(connection.disconnect, { scope }));
    await launch(() => allSettled(connection.connect, { scope }));
    await closeSocket(sockets[1], 1006);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(sockets).toHaveLength(3);
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

  it("should take the connection with a fresh connect after its own token change", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    token = "token-2";

    await launch(() => allSettled(connection.tokenRenewedHere, { scope }));
    await closeSocket(first, 4001);

    expect(sockets).toHaveLength(2);
    expect(first.close).toHaveBeenCalled();
    expect(sockets[1].query.get("resume")).toBeNull();
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);
    expect(sockets).toHaveLength(2);
  });
});

describe("app/model/socketConnection.model — held elsewhere", () => {
  it("should not reconnect by itself when another tab took the connection", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await closeSocket(first, 4000);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS * 10);

    expect(sockets).toHaveLength(1);
    expect(scope.getState(connection.$elsewhere)).toBe("tab");
  });

  it("should tell a refused reconnect from a registered socket another page replaced", async () => {
    const scope = fork();
    const taken: unknown[] = [];
    createWatch({
      unit: callResumeModel.transportTakenElsewhere,
      fn: (value) => taken.push(value),
      scope,
    });
    const first = await connectReady(scope);

    await closeSocket(first, 4000);
    await launch(() => allSettled(resumed, { scope }));
    await closeSocket(sockets[1], 4000);

    expect(taken).toEqual([
      { role: "tutor", refused: false },
      { role: "tutor", refused: true },
    ]);
  });

  it("should wait on the open socket while another tab is in a call and ask again once it ends", async () => {
    const scope = fork();
    await launch(() => allSettled(connection.connect, { scope }));
    const [waiting] = sockets;
    waiting.onopen?.();
    waiting.onmessage?.({ data: CONNECTION_WAITING });

    expect(scope.getState(connection.$elsewhere)).toBe("call");
    expect(scope.getState(connection.$isConnected)).toBe(false);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS * 10);
    expect(sockets).toHaveLength(1);

    await closeSocket(waiting, 4003);
    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");

    await closeSocket(sockets[1], 4000);
    expect(scope.getState(connection.$elsewhere)).toBe("tab");
  });

  it("should not race the holder when its waiting socket drops (regression: waiting tab took the connection after a server restart)", async () => {
    const scope = fork();
    await launch(() => allSettled(connection.connect, { scope }));
    sockets[0].onmessage?.({ data: CONNECTION_WAITING });

    await closeSocket(sockets[0], 1006);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS * 10);

    expect(sockets).toHaveLength(1);
    expect(scope.getState(connection.$elsewhere)).toBe("tab");

    await launch(() => allSettled(resumed, { scope }));
    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");
  });

  it("should keep the call banner until the retry after the call is answered (regression: empty banner between call and tab)", async () => {
    const scope = fork();
    await launch(() => allSettled(connection.connect, { scope }));
    sockets[0].onmessage?.({ data: CONNECTION_WAITING });
    const seen: unknown[] = [];
    const watcher = createWatch({ unit: connection.$elsewhere, fn: (v) => seen.push(v), scope });

    await closeSocket(sockets[0], 4003);
    expect(scope.getState(connection.$elsewhere)).toBe("call");
    await closeSocket(sockets[1], 4000);
    watcher.unsubscribe();

    expect(scope.getState(connection.$elsewhere)).toBe("tab");
    expect(seen).not.toContain(null);
  });

  it("should not reopen a waiting socket when the user comes back to the tab", async () => {
    const scope = fork();
    await launch(() => allSettled(connection.connect, { scope }));
    sockets[0].onmessage?.({ data: CONNECTION_WAITING });

    await launch(() => allSettled(resumed, { scope }));

    expect(sockets).toHaveLength(1);
  });

  it("should retry at once when the token changes while the connection is held elsewhere", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);
    token = "token-2";

    await launch(() => allSettled(connection.tokenRenewed, { scope }));

    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");
  });

  it("should retry when the user comes back to a tab held elsewhere", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);

    await launch(() => allSettled(resumed, { scope }));
    sockets[1].ready();

    expect(scope.getState(connection.$elsewhere)).toBeNull();
    expect(scope.getState(connection.$isConnected)).toBe(true);
  });
});

describe("app/model/socketConnection.model — coming back (039)", () => {
  it("should reconnect at once when the page comes back to a dropped socket", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 1006);
    expect(sockets).toHaveLength(1);

    await launch(() => allSettled(resumed, { scope }));

    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS * 2);
    expect(sockets).toHaveLength(2);
  });

  it("should reconnect at once when the browser is online again", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 1006);

    await launch(() => allSettled(online, { scope }));

    expect(sockets).toHaveLength(2);
  });

  it("should not open a second socket when coming back to a connected one", async () => {
    const scope = fork();
    await connectReady(scope);

    await launch(() => allSettled(resumed, { scope }));
    await launch(() => allSettled(online, { scope }));

    expect(sockets).toHaveLength(1);
  });

  it("should not reconnect a disabled connection on coming back", async () => {
    const scope = fork();
    await connectReady(scope);
    await launch(() => allSettled(connection.disconnect, { scope }));

    await launch(() => allSettled(resumed, { scope }));

    expect(sockets).toHaveLength(1);
  });

  it("should reopen a socket that looks open but stopped answering", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await launch(() => allSettled(callResumeModel.transportStale, { scope, params: "tutor" }));

    expect(first.close).toHaveBeenCalled();
    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");
    expect(sockets[1].query.get("tab")).toBe(first.query.get("tab"));
  });

  it("should reopen a dead socket without resume while a tapped notification waits for its call", async () => {
    const scope = fork({ values: [[callNotificationOpenModel.$pendingNotificationCallId, "c-1"]] });
    await connectReady(scope);

    await launch(() => allSettled(callResumeModel.transportStale, { scope, params: "tutor" }));

    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBeNull();
  });

  it("should leave the socket alone when the socket of the other role stopped answering", async () => {
    const scope = fork();
    const first = await connectReady(scope);

    await launch(() => allSettled(callResumeModel.transportStale, { scope, params: "student" }));

    expect(first.close).not.toHaveBeenCalled();
    expect(sockets).toHaveLength(1);
  });

  it("should not force a reconnect of a tab waiting for a call elsewhere", async () => {
    const scope = fork();
    await launch(() => allSettled(connection.connect, { scope }));
    sockets[0].onmessage?.({ data: CONNECTION_WAITING });

    await launch(() => allSettled(callResumeModel.transportStale, { scope, params: "tutor" }));

    expect(sockets).toHaveLength(1);
  });

  it("should ask for the connection at once when the holder of the call is gone (4004)", async () => {
    const scope = fork();
    await launch(() => allSettled(connection.connect, { scope }));
    sockets[0].onmessage?.({ data: CONNECTION_WAITING });

    await closeSocket(sockets[0], 4004);

    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");
  });

  it("should ask for the connection of a gone holder only once the hidden tab is looked at (regression: the hidden tab won and the visible one got «Использовать здесь»)", async () => {
    const scope = fork({ values: [[callPresenceModel.$isVisible, false]] });
    await launch(() => allSettled(connection.connect, { scope }));
    sockets[0].onmessage?.({ data: CONNECTION_WAITING });

    await closeSocket(sockets[0], 4004);
    await vi.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);
    await launch(() => allSettled(online, { scope }));

    expect(sockets).toHaveLength(1);
    expect(scope.getState(connection.$elsewhere)).toBe("call");

    await launch(() => allSettled(resumed, { scope }));
    await launch(() => allSettled(resumed, { scope }));

    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBe("1");
  });

  it("should still ask at once when the call in another tab ended while hidden (4003)", async () => {
    const scope = fork({ values: [[callPresenceModel.$isVisible, false]] });
    await launch(() => allSettled(connection.connect, { scope }));
    sockets[0].onmessage?.({ data: CONNECTION_WAITING });

    await closeSocket(sockets[0], 4003);

    expect(sockets).toHaveLength(2);
  });
});

describe("app/model/socketConnection.model — opened from a call notification (039)", () => {
  it("should take the connection back with an explicit connect when another device holds it", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 4000);

    await launch(() => allSettled(openedForCall, { scope }));

    expect(sockets).toHaveLength(2);
    expect(sockets[1].query.get("resume")).toBeNull();
  });

  it("should replace the resume reconnect opened on coming back (regression: «Использовать здесь» instead of the incoming call)", async () => {
    const scope = fork();
    const first = await connectReady(scope);
    await closeSocket(first, 1006);
    await launch(() => allSettled(resumed, { scope }));
    expect(sockets[1].query.get("resume")).toBe("1");

    await launch(() => allSettled(openedForCall, { scope }));

    expect(sockets[1].close).toHaveBeenCalled();
    expect(sockets).toHaveLength(3);
    expect(sockets[2].query.get("resume")).toBeNull();
    expect(sockets[2].query.get("tab")).toBe(first.query.get("tab"));
  });

  it("should keep a registered socket and a socket waiting for a call elsewhere", async () => {
    const scope = fork();
    await connectReady(scope);
    await launch(() => allSettled(openedForCall, { scope }));
    expect(sockets).toHaveLength(1);

    const waitingScope = fork();
    await launch(() => allSettled(connection.connect, { scope: waitingScope }));
    sockets[1].onmessage?.({ data: CONNECTION_WAITING });
    await launch(() => allSettled(openedForCall, { scope: waitingScope }));
    expect(sockets).toHaveLength(2);
  });

  it("should not open a disabled connection", async () => {
    const scope = fork();

    await launch(() => allSettled(openedForCall, { scope }));

    expect(sockets).toHaveLength(0);
  });
});
