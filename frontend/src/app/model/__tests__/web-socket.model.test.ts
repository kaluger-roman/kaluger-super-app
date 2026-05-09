import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  connectWebSocket,
  connectWebSocketFx,
  disconnectWebSocket,
  reconnectTimeoutFx,
  webSocketClosed,
  $isWebSocketEnabled,
} from "../web-socket.model";

beforeEach(() => {
  localStorage.setItem("authToken", "test-token");
});

describe("app/model/web-socket.model — reconnect", () => {
  it("does NOT reconnect when user logged out before the timer fires (regression: stale reconnect after logout)", async () => {
    const reconnectHandler = vi.fn(() => Promise.resolve());
    const connectHandler = vi.fn(() => undefined);

    const scope = fork({
      handlers: [
        [reconnectTimeoutFx, reconnectHandler],
        [connectWebSocketFx, connectHandler],
      ],
    });

    // Initial connect counts as one call
    await allSettled(connectWebSocket, { scope });
    expect(connectHandler).toHaveBeenCalledTimes(1);

    // Socket closes → reconnect timer scheduled & resolves immediately under
    // the mocked handler, BUT we want to verify the doneData→connect step is
    // gated on enabled state. Simulate logout BEFORE the timer's done fires
    // by toggling state and manually calling reconnectTimeoutFx done in two
    // separate runs.
    const closeRun = allSettled(webSocketClosed, { scope });
    await allSettled(disconnectWebSocket, { scope });
    await closeRun;

    // After logout: even though reconnect timer resolved, connect should not
    // have been invoked again.
    expect(scope.getState($isWebSocketEnabled)).toBe(false);
    expect(connectHandler).toHaveBeenCalledTimes(1);
  });

  it("does NOT spawn parallel reconnect timers when webSocketClosed fires repeatedly (regression: parallel reconnects)", async () => {
    // Pending reconnect that never resolves on its own — we only care that
    // the second/third webSocketClosed do not start additional copies.
    const reconnectHandler = vi.fn(() => new Promise<void>(() => undefined));
    const connectHandler = vi.fn(() => undefined);

    const scope = fork({
      handlers: [
        [reconnectTimeoutFx, reconnectHandler],
        [connectWebSocketFx, connectHandler],
      ],
    });

    await allSettled(connectWebSocket, { scope });
    expect(connectHandler).toHaveBeenCalledTimes(1);

    // Fire-and-forget close events (don't await — the first reconnect Promise
    // never resolves, which is intentional). The pending-guard filter must
    // collapse the bursts down to a single reconnect call.
    void allSettled(webSocketClosed, { scope });
    void allSettled(webSocketClosed, { scope });
    void allSettled(webSocketClosed, { scope });

    // Yield so the synchronous chain settles.
    await new Promise((resolve) => setImmediate(resolve));

    expect(reconnectHandler).toHaveBeenCalledTimes(1);
    // No additional connect attempts because reconnect is still pending.
    expect(connectHandler).toHaveBeenCalledTimes(1);
  });

  it("does reconnect when still enabled after timeout", async () => {
    const reconnectHandler = vi.fn(() => Promise.resolve());
    const connectHandler = vi.fn(() => undefined);

    const scope = fork({
      handlers: [
        [reconnectTimeoutFx, reconnectHandler],
        [connectWebSocketFx, connectHandler],
      ],
    });

    await allSettled(connectWebSocket, { scope });
    expect(connectHandler).toHaveBeenCalledTimes(1);

    await allSettled(webSocketClosed, { scope });

    expect(reconnectHandler).toHaveBeenCalledTimes(1);
    expect(connectHandler).toHaveBeenCalledTimes(2);
    expect(scope.getState($isWebSocketEnabled)).toBe(true);
  });
});
