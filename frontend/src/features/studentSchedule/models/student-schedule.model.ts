import { createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import type { StudentLessonsByWeekResponse, StudentVisibleLesson } from "@shared";
import { studentCabinetApi } from "@shared";

import { addDays, getWeekStart, toIsoDate } from "./student-schedule.helpers";

export const StudentSchedulePageGate = createGate();

export const $weekStart = createStore<Date>(getWeekStart(new Date()));
export const $lessons = createStore<StudentVisibleLesson[]>([]);
export const $loadError = createStore<string | null>(null);

export const weekChanged = createEvent<Date>();
export const previousWeek = createEvent();
export const nextWeek = createEvent();
export const todayClicked = createEvent();

export const loadLessonsFx = createEffect(
  async (weekStart: Date): Promise<StudentLessonsByWeekResponse> =>
    studentCabinetApi.getLessonsByWeek(toIsoDate(weekStart))
);

export const $isLoading = loadLessonsFx.pending;

// External events from the WS model
export const lessonCreated = createEvent<StudentVisibleLesson>();
export const lessonUpdated = createEvent<StudentVisibleLesson>();
export const lessonDeleted = createEvent<string>();
export const lessonStatusUpdated = createEvent<{
  lessonId: string;
  status: StudentVisibleLesson["status"];
}>();

sample({ clock: weekChanged, target: $weekStart });
sample({
  clock: previousWeek,
  source: $weekStart,
  fn: (current) => addDays(current, -7),
  target: $weekStart,
});
sample({
  clock: nextWeek,
  source: $weekStart,
  fn: (current) => addDays(current, 7),
  target: $weekStart,
});
sample({
  clock: todayClicked,
  fn: () => getWeekStart(new Date()),
  target: $weekStart,
});

sample({ clock: $weekStart, target: loadLessonsFx });

sample({
  clock: StudentSchedulePageGate.open,
  source: $weekStart,
  target: loadLessonsFx,
});

sample({
  clock: loadLessonsFx.doneData,
  fn: (data) => data.lessons,
  target: $lessons,
});

sample({
  clock: loadLessonsFx.failData,
  fn: () => "Не удалось загрузить расписание. Попробуйте позже",
  target: $loadError,
});

sample({
  clock: loadLessonsFx.done,
  fn: () => null,
  target: $loadError,
});

// WS-driven reactions: реагируем на события только если урок попадает в видимую неделю.
const isLessonInWeek = (weekStart: Date, lesson: { startTime: string }): boolean => {
  const start = new Date(weekStart);
  const end = addDays(start, 7);
  const lessonStart = new Date(lesson.startTime);
  return lessonStart >= start && lessonStart < end;
};

sample({
  clock: lessonCreated,
  source: { weekStart: $weekStart, lessons: $lessons },
  fn: ({ weekStart, lessons }, lesson) => {
    if (!isLessonInWeek(weekStart, lesson)) return lessons;
    if (lessons.some((existing) => existing.id === lesson.id)) return lessons;
    return [...lessons, lesson].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  },
  target: $lessons,
});

sample({
  clock: lessonUpdated,
  source: { weekStart: $weekStart, lessons: $lessons },
  fn: ({ weekStart, lessons }, lesson) => {
    const wasVisible = lessons.some((existing) => existing.id === lesson.id);
    const fitsWeek = isLessonInWeek(weekStart, lesson);

    if (wasVisible && fitsWeek) {
      return lessons.map((existing) => (existing.id === lesson.id ? lesson : existing));
    }
    if (wasVisible && !fitsWeek) {
      return lessons.filter((existing) => existing.id !== lesson.id);
    }
    if (!wasVisible && fitsWeek) {
      return [...lessons, lesson].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    }
    return lessons;
  },
  target: $lessons,
});

sample({
  clock: lessonDeleted,
  source: $lessons,
  fn: (lessons, lessonId) => lessons.filter((l) => l.id !== lessonId),
  target: $lessons,
});

sample({
  clock: lessonStatusUpdated,
  source: $lessons,
  fn: (lessons, { lessonId, status }) =>
    lessons.map((l) => (l.id === lessonId ? { ...l, status } : l)),
  target: $lessons,
});
