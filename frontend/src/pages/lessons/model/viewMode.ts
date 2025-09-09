import { createEvent, createStore } from "effector";

export type LessonsViewMode = "paged" | "weekly" | "schedule";

export const setLessonsViewMode = createEvent<LessonsViewMode>();

export const $lessonsViewMode = createStore<LessonsViewMode>("paged").on(
  setLessonsViewMode,
  (_state, payload) => payload
);
