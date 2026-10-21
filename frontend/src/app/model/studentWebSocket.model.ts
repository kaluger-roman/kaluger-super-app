import { getStudentToken } from "@shared";

import * as appInitModel from "./appInit.model";
import * as socketConnectionModel from "./socketConnection.model";
import { STUDENT_WS_RECONNECT_DELAY_MS } from "./studentWebSocket.constants";
import { dispatchStudentMessage } from "./studentWebSocket.helpers";

// Connection lifecycle is bound to the **session**, not to any individual page.
// Cabinet features (calls, schedule updates) subscribe to inbound events via the
// dispatcher — no extra sockets required.
const connection = socketConnectionModel.createSocketConnection({
  path: "/ws/student",
  role: "student",
  getToken: getStudentToken,
  dispatch: dispatchStudentMessage,
  reconnectDelayMs: STUDENT_WS_RECONNECT_DELAY_MS,
  resumed: appInitModel.appResumed,
  logLabel: "Student WS",
});

export const connectStudentWebSocket = connection.connect;
export const disconnectStudentWebSocket = connection.disconnect;
export const studentWebSocketOpened = connection.ready;
export const studentWebSocketClosed = connection.closed;
export const connectStudentWebSocketFx = connection.connectFx;

export const $studentWebSocketConnection = connection.$connection;
export const $isStudentWebSocketEnabled = connection.$isEnabled;
export const $isStudentWebSocketConnected = connection.$isConnected;
// Another tab or device of the same student holds the connection; this tab waits to be taken back.
export const $elsewhere = connection.$elsewhere;
