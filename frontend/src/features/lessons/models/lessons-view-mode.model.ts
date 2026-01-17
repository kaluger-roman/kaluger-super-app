import { createEvent, createStore, sample } from "effector";

export type LessonsViewMode = "paged" | "weekly" | "schedule";

export const setLessonsViewMode = createEvent<LessonsViewMode>();
export const setCurrentWeek = createEvent<Date>();
export const goToNextWeek = createEvent();
export const goToPrevWeek = createEvent();

export const $lessonsViewMode = createStore<LessonsViewMode>("paged");

sample({
  clock: setLessonsViewMode,
  target: $lessonsViewMode,
});

// Get current week start (Monday)
const getCurrentWeekStart = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(now.setDate(diff));
};

export const $currentWeek = createStore<Date>(getCurrentWeekStart());

sample({
  clock: setCurrentWeek,
  target: $currentWeek,
});

sample({
  clock: goToNextWeek,
  source: $currentWeek,
  fn: (state) => {
    const nextWeek = new Date(state);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  },
  target: $currentWeek,
});

sample({
  clock: goToPrevWeek,
  source: $currentWeek,
  fn: (state) => {
    const prevWeek = new Date(state);
    prevWeek.setDate(prevWeek.getDate() - 7);
    return prevWeek;
  },
  target: $currentWeek,
});
