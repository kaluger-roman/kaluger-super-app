import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { lessonModel } from "@entities";
import { changePasswordModel } from "@features";

import type { SocketOpenParams } from "../socketConnection.types";
import { WS_RECONNECT_DELAY_MS } from "../webSocket.constants";
import {
  connectWebSocket,
  connectWebSocketFx,
  handleLessonStatusUpdate,
  tokenStorageChanged,
  webSocketClosed,
  $elsewhere,
} from "../webSocket.model";

// The generic reconnect flow is covered in socketConnection.model.test.ts; these tests pin
// what the tutor socket adds on top: token revocation and lesson updates.
// patronum `delay` keeps the scope busy until its timer fires, so allSettled calls that
// schedule a reconnect are fire-and-forget and the clock is driven explicitly.
beforeEach(() => {
  localStorage.setItem("authToken", "test-token");
  vi.useFakeTimers();
});

afterEach(() => {
  localStorage.removeItem("authToken");
  vi.useRealTimers();
});

const REVOKED_CLOSE = { revokedToken: "test-token", elsewhere: null };

const createScope = () => {
  const connectHandler = vi.fn((_params: SocketOpenParams) => null);
  const scope = fork({ handlers: [[connectWebSocketFx, connectHandler]] });
  return { scope, connectHandler };
};

describe("app/model/webSocket.model — revoked token", () => {
  it("ends the session instead of reconnecting when the server revoked the current token", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    void allSettled(webSocketClosed, { scope, params: REVOKED_CLOSE });
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);

    expect(connectHandler).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("authToken")).toBeNull();
  });

  it("reconnects at once when this tab stores a new token after its own password change", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    void allSettled(webSocketClosed, { scope, params: REVOKED_CLOSE });
    await vi.advanceTimersByTimeAsync(0);
    void allSettled(changePasswordModel.persistTokenFx, { scope, params: "fresh-token" });
    await vi.advanceTimersByTimeAsync(0);

    expect(connectHandler).toHaveBeenCalledTimes(2);
    expect(connectHandler).toHaveBeenLastCalledWith(expect.objectContaining({ resume: true }));
  });

  it("reconnects at once when another tab of this browser stored a new token", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    void allSettled(webSocketClosed, { scope, params: REVOKED_CLOSE });
    await vi.advanceTimersByTimeAsync(0);
    void allSettled(tokenStorageChanged, { scope });
    await vi.advanceTimersByTimeAsync(0);

    expect(connectHandler).toHaveBeenCalledTimes(2);
  });

  it("reconnects with the new token when this tab replaced the revoked one", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });

    void allSettled(webSocketClosed, { scope, params: REVOKED_CLOSE });
    localStorage.setItem("authToken", "fresh-token");
    await vi.advanceTimersByTimeAsync(WS_RECONNECT_DELAY_MS);

    expect(connectHandler).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("authToken")).toBe("fresh-token");
  });

  it("retries a tab held elsewhere after its own password change logged the holder out", async () => {
    const { scope, connectHandler } = createScope();
    await allSettled(connectWebSocket, { scope });
    void allSettled(webSocketClosed, { scope, params: { revokedToken: null, elsewhere: "tab" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(scope.getState($elsewhere)).toBe("tab");

    void allSettled(changePasswordModel.persistTokenFx, { scope, params: "fresh-token" });
    await vi.advanceTimersByTimeAsync(0);

    expect(connectHandler).toHaveBeenCalledTimes(2);
    expect(connectHandler).toHaveBeenLastCalledWith(expect.objectContaining({ resume: true }));
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
