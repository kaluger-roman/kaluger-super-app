import { dispatchCallSignal, parseCallSignal } from "@features/videoCall";
import { expireTutorSession, getTutorToken } from "@shared";

import type { LessonStatusUpdate } from "./webSocket.types";

const isLessonStatusUpdate = (data: unknown): data is LessonStatusUpdate & { type: string } => {
  if (typeof data !== "object" || data === null) return false;
  const { type, lessonId, status } = data as Record<string, unknown>;
  return (
    type === "lesson_status_updated" && typeof lessonId === "string" && typeof status === "string"
  );
};

export const dispatchTutorMessage = (
  raw: string,
  onLessonStatus: (update: LessonStatusUpdate) => void
): void => {
  try {
    const data: unknown = JSON.parse(raw);
    const callSignal = parseCallSignal(data);
    if (callSignal) {
      dispatchCallSignal(callSignal, "tutor");
      return;
    }
    if (isLessonStatusUpdate(data)) {
      onLessonStatus({ lessonId: data.lessonId, status: data.status });
    }
  } catch (error) {
    console.error("WebSocket message parsing error:", error);
  }
};

// Another tab changed the stored token: follow a new one, or log out with the holder tab.
export const followStoredTutorToken = (): boolean => {
  if (getTutorToken()) return true;
  expireTutorSession();
  return false;
};

// A socket closed for a revoked token reconnects only if this tab got a new token meanwhile
// (its own password change); otherwise the session is over.
export const resumeTutorSession = (revokedToken: string | null): boolean => {
  if (revokedToken === null || getTutorToken() !== revokedToken) return true;
  expireTutorSession();
  return false;
};
