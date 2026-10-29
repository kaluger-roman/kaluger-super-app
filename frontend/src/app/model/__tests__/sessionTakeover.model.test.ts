import { allSettled, createWatch, fork } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callModel } from "@features/videoCall";
import { resetCallTransportsForTests } from "@features/videoCall/testSeams.helpers";

import "../sessionTakeover.model";
import * as studentWebSocketModel from "../studentWebSocket.model";
import * as webSocketModel from "../webSocket.model";
import type { ElsewhereReason } from "../webSocket.types";

const NO_TRANSPORT = "Нет связи с сервером. Проверьте интернет и попробуйте снова";

// patronum `delay` keeps the scope busy, so units are launched fire-and-forget.
const placeCallWhileHeld = async (reason: ElsewhereReason | null) => {
  const scope = fork({
    handlers: [
      [webSocketModel.connectWebSocketFx, () => null],
      [studentWebSocketModel.connectStudentWebSocketFx, () => null],
    ],
  });
  void allSettled(webSocketModel.connectWebSocket, { scope });
  void allSettled(webSocketModel.webSocketClosed, {
    scope,
    params: { revokedToken: null, elsewhere: reason, callEnded: false, holderGone: false },
  });
  await vi.advanceTimersByTimeAsync(0);

  const failures: string[] = [];
  const watcher = createWatch({
    unit: callModel.callFailed,
    fn: (text) => failures.push(text),
    scope,
  });
  void allSettled(callModel.callStarted, {
    scope,
    params: { studentId: "s-1", peerName: "Анна", lesson: null },
  });
  await vi.advanceTimersByTimeAsync(0);
  watcher.unsubscribe();
  return failures;
};

beforeEach(() => {
  localStorage.setItem("authToken", "test-token");
  resetCallTransportsForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  localStorage.removeItem("authToken");
  vi.useRealTimers();
});

describe("app/model/sessionTakeover.model — calls from a tab held elsewhere", () => {
  it("should suggest taking the connection back when another tab holds it", async () => {
    expect(await placeCallWhileHeld("tab")).toEqual([
      "Приложение открыто в другой вкладке или на другом устройстве. Нажмите «Использовать здесь», чтобы звонить отсюда",
    ]);
  });

  it("should ask to wait, not to press the disabled button, while the other tab is in a call", async () => {
    expect(await placeCallWhileHeld("call")).toEqual([
      "В другой вкладке или на другом устройстве идёт звонок. Позвонить отсюда можно после его завершения",
    ]);
  });

  it("should report a lost connection when no other tab holds it", async () => {
    expect(await placeCallWhileHeld(null)).toEqual([NO_TRANSPORT]);
  });
});
