import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { lessonModel } from "@entities";
import { changePasswordModel } from "@features";

import * as appInitModel from "../appInit.model";
import { WS_RECONNECT_DELAY_MS } from "../webSocket.constants";
import {
  connectWebSocket,
  connectWebSocketFx,
  disconnectWebSocket,
  handleLessonStatusUpdate,
  tokenStorageChanged,
  webSocketClosed,
  $elsewhere,
  $isWebSocketEnabled,
} from "../webSocket.model";

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

const PLAIN_CLOSE = { revokedToken: null, elsewhere: null };

const createScope = () => {
  const connectHandler = vi.fn((_resume: boolean) => undefined);
  const scope = fork({ handlers: [[connectWebSocketFx, connectHandler]] });
  return { scope, connectHandler };
};

describe("app/model/webSocket.model — reconnect", () => {
  it("marks automatic reconnects as resumes and explicit connects as take-overs", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    const closeRun = allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE });
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await closeRun;

    expect(connectHandler.mock.calls.map(([resume]) => resume)).toEqual([false, true]);
  });

  it("lets a hidden tab reconnect only once it is shown again", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

    try {
      const closeRun = allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE });
      await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
      await closeRun;
      expect(connectHandler).toHaveBeenCalledTimes(1);

      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      await allSettled(appInitModel.appResumed, { scope });
      expect(connectHandler).toHaveBeenCalledTimes(2);
      expect(connectHandler).toHaveBeenLastCalledWith(true);
    } finally {
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    }
  });

  it("ends the session instead of reconnecting when the server revoked the current token", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    const closeRun = allSettled(webSocketClosed, {
      scope,
      params: { revokedToken: "test-token", elsewhere: null },
    });
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await closeRun;

    expect(connectHandler).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("authToken")).toBeNull();
  });

  it("reconnects at once when this tab stores a new token after its own password change", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    void allSettled(webSocketClosed, {
      scope,
      params: { revokedToken: "test-token", elsewhere: null },
    });
    await vi.advanceTimersByTimeAsync(0);
    // The pending reconnect delay keeps the scope busy, so allSettled would wait for it.
    void allSettled(changePasswordModel.persistTokenFx, { scope, params: "fresh-token" });
    await vi.advanceTimersByTimeAsync(0);

    expect(connectHandler).toHaveBeenCalledTimes(2);
  });

  it("stays disconnected and reports it when another tab takes the connection over", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    const closeRun = allSettled(webSocketClosed, {
      scope,
      params: { revokedToken: null, elsewhere: "tab" },
    });
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await closeRun;

    expect(connectHandler).toHaveBeenCalledTimes(1);
    expect(scope.getState($elsewhere)).toBe("tab");
  });

  it("reconnects at once when another tab of this browser stored a new token", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    void allSettled(webSocketClosed, {
      scope,
      params: { revokedToken: "test-token", elsewhere: null },
    });
    await vi.advanceTimersByTimeAsync(0);
    void allSettled(tokenStorageChanged, { scope });
    await vi.advanceTimersByTimeAsync(0);

    expect(connectHandler).toHaveBeenCalledTimes(2);
  });

  it("retries a resume connect when the user comes back to a tab held elsewhere", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });
    await allSettled(webSocketClosed, { scope, params: { revokedToken: null, elsewhere: "call" } });

    await allSettled(appInitModel.appResumed, { scope });

    expect(connectHandler).toHaveBeenLastCalledWith(true);
    expect(scope.getState($elsewhere)).toBe("call");
  });

  it("reconnects with the new token when this tab replaced the revoked one", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    const closeRun = allSettled(webSocketClosed, {
      scope,
      params: { revokedToken: "test-token", elsewhere: null },
    });
    localStorage.setItem("authToken", "fresh-token");
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await closeRun;

    expect(connectHandler).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("authToken")).toBe("fresh-token");
  });

  it("does NOT reconnect when user logged out before the timer fires (regression: stale reconnect after logout)", async () => {
    const { scope, connectHandler } = createScope();

    await allSettled(connectWebSocket, { scope });
    expect(connectHandler).toHaveBeenCalledTimes(1);

    const closeRun = allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE });
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
      allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE }),
      allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE }),
      allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE }),
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

    const closeRun = allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE });

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

    const firstClose = allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE });
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await firstClose;
    expect(connectHandler).toHaveBeenCalledTimes(2);

    const secondClose = allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE });
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await secondClose;

    expect(connectHandler).toHaveBeenCalledTimes(3);
  });

  it("does NOT open a second socket when logout + login happen inside the reconnect delay (regression: stale delay after re-login)", async () => {
    const { scope, connectHandler } = createScope();

    await allSettled(connectWebSocket, { scope });

    const runs = [
      allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE }),
      allSettled(disconnectWebSocket, { scope }),
      allSettled(connectWebSocket, { scope }),
    ];
    expect(connectHandler).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await Promise.all(runs);

    expect(scope.getState($isWebSocketEnabled)).toBe(true);
    expect(connectHandler).toHaveBeenCalledTimes(2);
  });

  it("still reconnects after a close that follows re-login while a stale delay is pending (regression: stale delay swallowing the next reconnect)", async () => {
    const { scope, connectHandler } = createScope();

    await allSettled(connectWebSocket, { scope });

    const runs = [
      allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE }),
      allSettled(disconnectWebSocket, { scope }),
      allSettled(connectWebSocket, { scope }),
      allSettled(webSocketClosed, { scope, params: PLAIN_CLOSE }),
    ];
    expect(connectHandler).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(2);

    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);
    await Promise.all(runs);

    expect(connectHandler).toHaveBeenCalledTimes(3);
  });
});

describe("app/model/webSocket.model — lesson_status_updated", () => {
  it("refetches the lesson instead of writing the status back (regression: echo PUT)", async () => {
    const updateLessonHandler = vi.fn(async () => ({}) as never);
    const syncLessonHandler = vi.fn(async () => ({}) as never);
    const scope = fork({
      handlers: [
        [lessonModel.updateLessonFx, updateLessonHandler],
        [lessonModel.syncLessonFx, syncLessonHandler],
      ],
    });

    await allSettled(handleLessonStatusUpdate, {
      scope,
      params: { lessonId: "lesson-1", status: "COMPLETED" },
    });

    expect(syncLessonHandler).toHaveBeenCalledWith("lesson-1");
    expect(updateLessonHandler).not.toHaveBeenCalled();
  });
});
