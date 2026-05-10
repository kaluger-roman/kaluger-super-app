import type { Lesson } from "@shared";

export const sortByStartTime = (lessons: Lesson[]): Lesson[] =>
  lessons
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
