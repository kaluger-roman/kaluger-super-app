import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  connectWebSocket,
  connectWebSocketFx,
  disconnectWebSocket,
  webSocketClosed,
  $isWebSocketEnabled,
  WS_RECONNECT_DELAY_MS,
} from "../web-socket.model";

// The reconnect delay lives in patronum's `delay`, whose internal effect stays
// pending until the real timer fires — so every `allSettled` that schedules a
// reconnect is fire-and-forget, and the test drives the clock explicitly.
beforeEach(() => {
  localStorage.setItem("authToken", "test-token");
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const createScope = () => {
  const connectHandler = vi.fn(() => undefined);
  const scope = fork({ handlers: [[connectWebSocketFx, connectHandler]] });
  return { scope, connectHandler };
};

describe("app/model/web-socket.model — reconnect", () => {
  it("does NOT reconnect when user logged out before the timer fires (regression: stale reconnect after logout)", async () => {
    const { scope, connectHandler } = createScope();

    await allSettled(connectWebSocket, { scope });
    expect(connectHandler).toHaveBeenCalledTimes(1);

    const closeRun = allSettled(webSocketClosed, { scope });
    const disconnectRun = allSettled(disconnectWebSocket, { scope });
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await Promise.all([closeRun, disconnectRun]);

    expect(scope.getState($isWebSocketEnabled)).toBe(false);
    expect(connectHandler).toHaveBeenCalledTimes(1);
  });

  it("does NOT spawn parallel reconnect timers when webSocketClosed fires repeatedly (regression: parallel reconnects)", async () => {
    const { scope, connectHandler } = createScope();

    await allSettled(connectWebSocket, { scope });
    expect(connectHandler).toHaveBeenCalledTimes(1);

    const closeRuns = [
      allSettled(webSocketClosed, { scope }),
      allSettled(webSocketClosed, { scope }),
      allSettled(webSocketClosed, { scope }),
    ];

    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await Promise.all(closeRuns);

    expect(connectHandler).toHaveBeenCalledTimes(2);
  });

  it("does reconnect when still enabled after timeout", async () => {
    const { scope, connectHandler } = createScope();

    await allSettled(connectWebSocket, { scope });
    expect(connectHandler).toHaveBeenCalledTimes(1);

    const closeRun = allSettled(webSocketClosed, { scope });

    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS - 1);
    expect(connectHandler).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await closeRun;

    expect(connectHandler).toHaveBeenCalledTimes(2);
    expect(scope.getState($isWebSocketEnabled)).toBe(true);
  });

  it("schedules a fresh reconnect after the previous one has fired", async () => {
    const { scope, connectHandler } = createScope();

    await allSettled(connectWebSocket, { scope });

    const firstClose = allSettled(webSocketClosed, { scope });
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await firstClose;
    expect(connectHandler).toHaveBeenCalledTimes(2);

    const secondClose = allSettled(webSocketClosed, { scope });
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await secondClose;

    expect(connectHandler).toHaveBeenCalledTimes(3);
  });
});
