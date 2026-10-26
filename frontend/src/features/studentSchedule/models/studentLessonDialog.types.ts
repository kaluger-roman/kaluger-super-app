import type { StudentVisibleLesson } from "@shared";

export type StudentLessonCallSource = {
  lesson: StudentVisibleLesson | null;
  tutorName: string | null;
};
