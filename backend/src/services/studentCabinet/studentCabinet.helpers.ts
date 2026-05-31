import type { StudentLessonResponse } from "../../types";

type LessonShape = {
  id: string;
  subject: "MATHEMATICS" | "PHYSICS";
  startTime: Date;
  endTime: Date;
  status:
    | "SCHEDULED"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED"
    | "IN_PROGRESS";
};

export const toStudentLessonResponse = (
  lesson: LessonShape
): StudentLessonResponse => ({
  id: lesson.id,
  subject: lesson.subject,
  startTime: lesson.startTime.toISOString(),
  endTime: lesson.endTime.toISOString(),
  status: lesson.status,
});
