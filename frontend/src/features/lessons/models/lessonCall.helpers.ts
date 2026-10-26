import type { CallLessonSummary } from "@entities";
import type { Lesson } from "@shared";

import type { StartCallParams } from "../../videoCall";

export const toCallLesson = (lesson: Lesson): CallLessonSummary => ({
  id: lesson.id,
  subject: lesson.subject,
  startTime: lesson.startTime,
  endTime: lesson.endTime,
});

// The same condition as the «Видеозвонок» button of the student card: a linked student account.
export const hasCallableStudent = (lesson: Lesson): boolean => Boolean(lesson.student?.studentUser);

export const toLessonCall = (lesson: Lesson | undefined): StartCallParams | null =>
  lesson?.student && hasCallableStudent(lesson)
    ? { studentId: lesson.student.id, peerName: lesson.student.name, lesson: toCallLesson(lesson) }
    : null;

export const isStartCall = (call: StartCallParams | null): call is StartCallParams => call !== null;

export const isCallOfLesson = (lesson: Lesson | undefined, call: StartCallParams): boolean =>
  lesson !== undefined && call.lesson?.id === lesson.id;
