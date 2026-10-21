import { combine, createEvent, sample } from "effector";

import { callModel } from "@features/videoCall";

import { CALLS_ELSEWHERE_TEXT } from "./sessionTakeover.constants";
import * as studentWebSocketModel from "./studentWebSocket.model";
import * as webSocketModel from "./webSocket.model";
import type { ElsewhereReason } from "./webSocket.types";

// A call in another tab outweighs a plain take-over: this tab cannot get the connection back yet.
export const $sessionElsewhere = combine(
  webSocketModel.$elsewhere,
  studentWebSocketModel.$elsewhere,
  (tutor, student): ElsewhereReason | null =>
    tutor === "call" || student === "call" ? "call" : (tutor ?? student)
);

export const takeOverRequested = createEvent();

sample({
  clock: takeOverRequested,
  source: webSocketModel.$elsewhere,
  filter: (reason) => reason === "tab",
  fn: () => undefined,
  target: webSocketModel.connectWebSocket,
});
sample({
  clock: takeOverRequested,
  source: studentWebSocketModel.$elsewhere,
  filter: (reason) => reason === "tab",
  fn: () => undefined,
  target: studentWebSocketModel.connectStudentWebSocket,
});

sample({
  clock: $sessionElsewhere,
  fn: (reason) => (reason ? CALLS_ELSEWHERE_TEXT[reason] : null),
  target: callModel.callsUnavailableChanged,
});
