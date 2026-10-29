import { dispatchCallSignal, parseCallSignal } from "@features/videoCall";
import { expireTutorSession, getTutorToken, isRecord } from "@shared";

import type { LessonStatusUpdate } from "./webSocket.types";

const toLessonStatusUpdate = (data: unknown): LessonStatusUpdate | null => {
  if (!isRecord(data) || data.type !== "lesson_status_updated") return null;
  const { lessonId, status } = data;
  return typeof lessonId === "string" && typeof status === "string" ? { lessonId, status } : null;
};

export const dispatchTutorMessage = (
  data: unknown,
  onLessonStatus: (update: LessonStatusUpdate) => void
): void => {
  const callSignal = parseCallSignal(data);
  if (callSignal) {
    dispatchCallSignal(callSignal, "tutor");
    return;
  }
  const lessonStatus = toLessonStatusUpdate(data);
  if (lessonStatus) onLessonStatus(lessonStatus);
};

// A socket closed for a revoked token reconnects only if this tab got a new token meanwhile;
// otherwise the session is over.
export const resumeTutorSession = (revokedToken: string | null): boolean => {
  if (revokedToken === null || getTutorToken() !== revokedToken) return true;
  expireTutorSession();
  return false;
};
