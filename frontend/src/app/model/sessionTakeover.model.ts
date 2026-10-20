import { combine, createEvent, sample } from "effector";

import * as studentWebSocketModel from "./studentWebSocket.model";
import * as webSocketModel from "./webSocket.model";

export const $isSessionElsewhere = combine(
  webSocketModel.$isReplacedElsewhere,
  studentWebSocketModel.$isReplacedElsewhere,
  (tutor, student) => tutor || student
);

export const takeOverRequested = createEvent();

sample({
  clock: takeOverRequested,
  source: webSocketModel.$isReplacedElsewhere,
  filter: Boolean,
  fn: () => undefined,
  target: webSocketModel.connectWebSocket,
});
sample({
  clock: takeOverRequested,
  source: studentWebSocketModel.$isReplacedElsewhere,
  filter: Boolean,
  fn: () => undefined,
  target: studentWebSocketModel.connectStudentWebSocket,
});
