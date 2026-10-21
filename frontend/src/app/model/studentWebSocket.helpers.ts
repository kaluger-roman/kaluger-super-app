import { studentScheduleModel } from "@features/studentSchedule";
import { dispatchCallSignal, parseCallSignal } from "@features/videoCall";
import type { StudentLessonWsEvent } from "@shared";

// Dispatcher for inbound messages — keep it dumb: parse, route to the relevant
// feature event. Adding a new event type later (video_call_incoming, push_*,
// etc.) is a single new `if (data.type === ...)` branch here.
export const dispatchStudentMessage = (raw: string): void => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const callSignal = parseCallSignal(parsed);
    if (callSignal) {
      dispatchCallSignal(callSignal, "student");
      return;
    }
    const data = parsed as StudentLessonWsEvent;
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
