import type { Lesson } from "@shared";
import { toDateKey } from "@shared";

export const groupLessonsByDay = (
  state: Record<string, Lesson[]>,
  lessons: Lesson[]
): Record<string, Lesson[]> => {
  const lessonsByDay: Record<string, Lesson[]> = {};
  lessons.forEach((lesson) => {
    const dateKey = toDateKey(lesson.startTime);
    if (!lessonsByDay[dateKey]) {
      lessonsByDay[dateKey] = [];
    }
    lessonsByDay[dateKey].push(lesson);
  });
  return { ...state, ...lessonsByDay };
};

export const addLessonToSchedule = (
  state: Record<string, Lesson[]>,
  newLesson: Lesson
): Record<string, Lesson[]> => {
  const dateKey = toDateKey(newLesson.startTime);
  const dayLessons = state[dateKey] || [];
  return {
    ...state,
    [dateKey]: [...dayLessons, newLesson],
  };
};

export const updateLessonInSchedule = (
  state: Record<string, Lesson[]>,
  updatedLesson: Lesson
): Record<string, Lesson[]> => {
  const dateKey = toDateKey(updatedLesson.startTime);
  const dayLessons = state[dateKey] || [];
  const updatedDayLessons = dayLessons.map((lesson) =>
    lesson.id === updatedLesson.id ? updatedLesson : lesson
  );
  return {
    ...state,
    [dateKey]: updatedDayLessons,
  };
};

export const removeLessonFromSchedule = (
  state: Record<string, Lesson[]>,
  removedId: string
): Record<string, Lesson[]> => {
  const newState = { ...state };
  Object.keys(newState).forEach((dateKey) => {
    newState[dateKey] = newState[dateKey].filter((lesson) => lesson.id !== removedId);
    if (newState[dateKey].length === 0) {
      delete newState[dateKey];
    }
  });
  return newState;
};
