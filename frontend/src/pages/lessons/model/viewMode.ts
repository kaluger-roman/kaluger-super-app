import { createEvent, createStore } from "effector";

export type LessonsViewMode = "paged" | "weekly" | "schedule";

export const setLessonsViewMode = createEvent<LessonsViewMode>();
export const setCurrentWeek = createEvent<Date>();
export const goToNextWeek = createEvent();
export const goToPrevWeek = createEvent();

export const $lessonsViewMode = createStore<LessonsViewMode>("schedule").on(
  setLessonsViewMode,
  (_state, payload) => payload
);

// Get current week start (Monday)
const getCurrentWeekStart = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(now.setDate(diff));
};

export const $currentWeek = createStore<Date>(getCurrentWeekStart())
  .on(setCurrentWeek, (_state, payload) => payload)
  .on(goToNextWeek, (state) => {
    const nextWeek = new Date(state);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  })
  .on(goToPrevWeek, (state) => {
    const prevWeek = new Date(state);
    prevWeek.setDate(prevWeek.getDate() - 7);
    return prevWeek;
  });
