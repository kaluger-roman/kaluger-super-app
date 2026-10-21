import { dispatchCallSignal, parseCallSignal } from "@features/videoCall";

import type { LessonStatusUpdate } from "./webSocket.types";

export const dispatchTutorMessage = (
  raw: string,
  onLessonStatus: (update: LessonStatusUpdate) => void
): void => {
  try {
    const data = JSON.parse(raw);
    const callSignal = parseCallSignal(data);
    if (callSignal) {
      dispatchCallSignal(callSignal, "tutor");
      return;
    }
    if (data.type === "lesson_status_updated") {
      onLessonStatus({ lessonId: data.lessonId, status: data.status });
    }
  } catch (error) {
    console.error("WebSocket message parsing error:", error);
  }
};
