import type { StudentVisibleLesson } from "@shared";

import type { StudentLessonCallSource } from "./studentLessonDialog.types";
import type { StartCallParams } from "../../videoCall";

export const findOpenedLesson = (
  lessons: StudentVisibleLesson[],
  lessonId: string | null
): StudentVisibleLesson | null => lessons.find((lesson) => lesson.id === lessonId) ?? null;

export const toStudentLessonCall = ({
  lesson,
  tutorName,
}: StudentLessonCallSource): StartCallParams | null =>
  lesson && tutorName
    ? {
        peerName: tutorName,
        lesson: {
          id: lesson.id,
          subject: lesson.subject,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
        },
      }
    : null;

export const isStartCall = (call: StartCallParams | null): call is StartCallParams => call !== null;

export const isCallOfOpenedLesson = (lessonId: string | null, call: StartCallParams): boolean =>
  lessonId !== null && call.lesson?.id === lessonId;
