import { studentScheduleModel } from "@features/studentSchedule";
import { dispatchCallSignal, parseCallSignal } from "@features/videoCall";
import type { StudentLessonWsEvent } from "@shared";
import { isRecord } from "@shared";

// Dispatcher for inbound messages — keep it dumb: route to the relevant feature event.
// Adding a new event type later is a single new branch here.
export const dispatchStudentMessage = (data: unknown): void => {
  const callSignal = parseCallSignal(data);
  if (callSignal) {
    dispatchCallSignal(callSignal, "student");
    return;
  }
  if (!isRecord(data)) return;
  const event = data as StudentLessonWsEvent;
  if (event.type === "lesson_created") {
    studentScheduleModel.lessonCreated(event.lesson);
  } else if (event.type === "lesson_updated") {
    studentScheduleModel.lessonUpdated(event.lesson);
  } else if (event.type === "lesson_deleted") {
    studentScheduleModel.lessonDeleted(event.lessonId);
  } else if (event.type === "lesson_status_updated") {
    studentScheduleModel.lessonStatusUpdated({ lessonId: event.lessonId, status: event.status });
  }
};
