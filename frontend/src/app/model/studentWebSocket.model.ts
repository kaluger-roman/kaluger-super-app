import { createEffect, createEvent, createStore, sample } from "effector";
import { delay } from "patronum";

import { callModel, clearCallTransport, setCallTransport } from "@features/videoCall";
import { getStudentToken, isPageVisible, resolveWsUrl } from "@shared";

import * as appInitModel from "./appInit.model";
import { STUDENT_WS_RECONNECT_DELAY_MS } from "./studentWebSocket.constants";
import { dispatchStudentMessage } from "./studentWebSocket.helpers";
import { WS_ELSEWHERE_CLOSE_CODES } from "./webSocket.constants";
import type { ElsewhereReason, StudentWebSocketClose } from "./webSocket.types";

// Connection lifecycle is bound to the **session**, not to any individual page.
// Future cabinet features (calls, push, etc.) just subscribe to incoming events
// via this dispatcher — no extra sockets required.

export const connectStudentWebSocket = createEvent();
export const disconnectStudentWebSocket = createEvent();
export const studentWebSocketOpened = createEvent();
export const studentWebSocketClosed = createEvent<StudentWebSocketClose>();

export const setStudentWebSocketConnection = createEvent<WebSocket | null>();

export const $studentWebSocketConnection = createStore<WebSocket | null>(null);
export const $isStudentWebSocketEnabled = createStore(false);
export const $isStudentWebSocketConnected = createStore(false);
// Another tab or device of the same student holds the connection; this tab waits to be taken back.
export const $elsewhere = createStore<ElsewhereReason | null>(null);

const $isReconnectScheduled = createStore(false);
// patronum `delay` cannot be cancelled. Every explicit connect/disconnect bumps
// the generation, and a fired reconnect is honored only if its generation is
// still current — otherwise leaving and re-entering the cabinet inside the
// delay opens a second socket.
const $reconnectGeneration = createStore(0);
const $isReconnectDeferred = createStore(false);

// true for an automatic reconnect, false for an explicit connect.
const socketOpenRequested = createEvent<boolean>();

// A hidden tab waits until it is shown, so after a server restart the tab in use reconnects
// first and keeps the connection.
const isPageVisibleFx = createEffect((): boolean => isPageVisible());

// `resume` marks an automatic reconnect: the server then keeps another tab's live socket
// instead of handing the connection to this tab.
export const connectStudentWebSocketFx = createEffect((resume: boolean): WebSocket | null => {
  const token = getStudentToken();
  if (!token) return null;

  const ws = new WebSocket(
    `${resolveWsUrl("/ws/student")}?token=${encodeURIComponent(token)}${resume ? "&resume=1" : ""}`
  );

  ws.onopen = () => {
    console.log("Student WS connected");
    setCallTransport("student", (message) => ws.send(JSON.stringify(message)), ws);
    studentWebSocketOpened();
  };

  ws.onmessage = (event) => {
    dispatchStudentMessage(event.data);
  };

  ws.onclose = (event) => {
    console.log("Student WS disconnected");
    const lostRole = clearCallTransport(ws);
    if (lostRole) callModel.transportDisconnected(lostRole);
    setStudentWebSocketConnection(null);
    studentWebSocketClosed({ elsewhere: WS_ELSEWHERE_CLOSE_CODES.get(event.code) ?? null });
  };

  ws.onerror = (error) => {
    console.error("Student WS error:", error);
  };

  // Сохраняем connection синхронно — ДО возвращения из эффекта. Иначе если
  // disconnectStudentWebSocket срабатывает между созданием WebSocket и
  // onopen (быстрый logout/нав), стор остаётся null и handshake продолжится
  // без шанса быть закрытым (orphaned socket).
  setStudentWebSocketConnection(ws);

  return ws;
});

export const disconnectStudentWebSocketFx = createEffect((ws: WebSocket | null) => {
  if (ws) {
    ws.close();
  }
});

sample({ clock: setStudentWebSocketConnection, target: $studentWebSocketConnection });

sample({ clock: studentWebSocketOpened, fn: () => true, target: $isStudentWebSocketConnected });

sample({ clock: studentWebSocketClosed, fn: () => false, target: $isStudentWebSocketConnected });

sample({ clock: connectStudentWebSocket, fn: () => true, target: $isStudentWebSocketEnabled });

sample({ clock: disconnectStudentWebSocket, fn: () => false, target: $isStudentWebSocketEnabled });

sample({ clock: connectStudentWebSocket, fn: () => false, target: socketOpenRequested });
sample({ clock: socketOpenRequested, target: connectStudentWebSocketFx });

sample({
  clock: disconnectStudentWebSocket,
  source: $studentWebSocketConnection,
  target: disconnectStudentWebSocketFx,
});

// Auto-reconnect after STUDENT_WS_RECONNECT_DELAY_MS while the session is
// still enabled. Close events during a scheduled reconnect are collapsed.
sample({
  clock: [socketOpenRequested, disconnectStudentWebSocket],
  source: $reconnectGeneration,
  fn: (generation) => generation + 1,
  target: $reconnectGeneration,
});

sample({
  clock: [socketOpenRequested, disconnectStudentWebSocket],
  fn: () => false,
  target: $isReconnectScheduled,
});

const reconnectScheduled = sample({
  clock: studentWebSocketClosed,
  source: {
    isEnabled: $isStudentWebSocketEnabled,
    isScheduled: $isReconnectScheduled,
    generation: $reconnectGeneration,
  },
  filter: ({ isEnabled, isScheduled }, { elsewhere }) => isEnabled && !isScheduled && !elsewhere,
  fn: ({ generation }) => generation,
});

sample({ clock: studentWebSocketClosed, fn: ({ elsewhere }) => elsewhere, target: $elsewhere });
// Cleared only once this tab holds the connection again, so a failed retry does not flicker.
sample({
  clock: [studentWebSocketOpened, disconnectStudentWebSocket],
  fn: () => null,
  target: $elsewhere,
});
// Coming back to the tab retries: if the holder tab was closed meanwhile, this one takes over.
sample({
  clock: appInitModel.appResumed,
  source: { elsewhere: $elsewhere, isEnabled: $isStudentWebSocketEnabled },
  filter: ({ elsewhere, isEnabled }) => elsewhere !== null && isEnabled,
  fn: () => true,
  target: socketOpenRequested,
});

sample({ clock: reconnectScheduled, fn: () => true, target: $isReconnectScheduled });

const reconnectDelayPassed = delay({
  source: reconnectScheduled,
  timeout: STUDENT_WS_RECONNECT_DELAY_MS,
});

sample({
  clock: reconnectDelayPassed,
  source: { isEnabled: $isStudentWebSocketEnabled, generation: $reconnectGeneration },
  filter: ({ isEnabled, generation }, scheduledGeneration) =>
    isEnabled && generation === scheduledGeneration,
  fn: () => undefined,
  target: isPageVisibleFx,
});
sample({
  clock: isPageVisibleFx.doneData,
  filter: Boolean,
  fn: () => true,
  target: socketOpenRequested,
});
sample({
  clock: isPageVisibleFx.doneData,
  fn: (visible) => !visible,
  target: $isReconnectDeferred,
});
sample({
  clock: [socketOpenRequested, disconnectStudentWebSocket],
  fn: () => false,
  target: $isReconnectDeferred,
});
sample({
  clock: appInitModel.appResumed,
  source: { isDeferred: $isReconnectDeferred, isEnabled: $isStudentWebSocketEnabled },
  filter: ({ isDeferred, isEnabled }) => isDeferred && isEnabled,
  fn: () => true,
  target: socketOpenRequested,
});
