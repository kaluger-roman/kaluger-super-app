import {
  createEffect,
  createEvent,
  createStore,
  sample,
} from "effector";

import { studentScheduleModel } from "@features/studentSchedule";
import type { StudentLessonWsEvent } from "@shared";
import { getStudentToken, resolveWsUrl } from "@shared";

// Connection lifecycle is bound to the **session**, not to any individual page.
// Future cabinet features (calls, push, etc.) just subscribe to incoming events
// via this dispatcher — no extra sockets required.

export const connectStudentWebSocket = createEvent();
export const disconnectStudentWebSocket = createEvent();
export const studentWebSocketOpened = createEvent();
export const studentWebSocketClosed = createEvent();

export const setStudentWebSocketConnection = createEvent<WebSocket | null>();

export const $studentWebSocketConnection = createStore<WebSocket | null>(null);
export const $isStudentWebSocketEnabled = createStore(false);
export const $isStudentWebSocketConnected = createStore(false);

// Dispatcher for inbound messages — keep it dumb: parse, route to the relevant
// feature event. Adding a new event type later (video_call_incoming, push_*,
// etc.) is a single new `if (data.type === ...)` branch here.
const dispatchMessage = (raw: string): void => {
  try {
    const data = JSON.parse(raw) as StudentLessonWsEvent;
    if (data.type === "lesson_created") {
      studentScheduleModel.lessonCreated(data.lesson);
    } else if (data.type === "lesson_updated") {
      studentScheduleModel.lessonUpdated(data.lesson);
    } else if (data.type === "lesson_deleted") {
      studentScheduleModel.lessonDeleted(data.lessonId);
    } else if (data.type === "lesson_status_updated") {
      studentScheduleModel.lessonStatusUpdated({
        lessonId: data.lessonId,
        status: data.status,
      });
    }
  } catch (error) {
    console.error("Student WS message parsing error:", error);
  }
};

export const connectStudentWebSocketFx = createEffect(
  (): WebSocket | null => {
    const token = getStudentToken();
    if (!token) return null;

    const ws = new WebSocket(
      `${resolveWsUrl("/ws/student")}?token=${encodeURIComponent(token)}`
    );

    ws.onopen = () => {
      console.log("Student WS connected");
      studentWebSocketOpened();
    };

    ws.onmessage = (event) => {
      dispatchMessage(event.data);
    };

    ws.onclose = () => {
      console.log("Student WS disconnected");
      setStudentWebSocketConnection(null);
      studentWebSocketClosed();
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
  }
);

export const disconnectStudentWebSocketFx = createEffect(
  (ws: WebSocket | null) => {
    if (ws) {
      ws.close();
    }
  }
);

sample({
  clock: setStudentWebSocketConnection,
  target: $studentWebSocketConnection,
});

sample({
  clock: studentWebSocketOpened,
  fn: () => true,
  target: $isStudentWebSocketConnected,
});

sample({
  clock: studentWebSocketClosed,
  fn: () => false,
  target: $isStudentWebSocketConnected,
});

sample({
  clock: connectStudentWebSocket,
  fn: () => true,
  target: $isStudentWebSocketEnabled,
});

sample({
  clock: disconnectStudentWebSocket,
  fn: () => false,
  target: $isStudentWebSocketEnabled,
});

sample({
  clock: connectStudentWebSocket,
  target: connectStudentWebSocketFx,
});

sample({
  clock: disconnectStudentWebSocket,
  source: $studentWebSocketConnection,
  target: disconnectStudentWebSocketFx,
});

// Auto-reconnect with backoff (exported so tests can override via fork's
// handlers map).
export const studentWebSocketReconnectTimeoutFx = createEffect(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 5000);
    })
);

sample({
  clock: studentWebSocketClosed,
  source: {
    isEnabled: $isStudentWebSocketEnabled,
    pending: studentWebSocketReconnectTimeoutFx.pending,
  },
  filter: ({ isEnabled, pending }) => isEnabled && !pending,
  fn: () => undefined,
  target: studentWebSocketReconnectTimeoutFx,
});

sample({
  clock: studentWebSocketReconnectTimeoutFx.doneData,
  source: $isStudentWebSocketEnabled,
  filter: (isEnabled) => isEnabled,
  fn: () => undefined,
  target: connectStudentWebSocket,
});
