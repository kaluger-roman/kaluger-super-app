import { createStore, createEvent, createEffect } from "effector";
import { loadStudents } from "../../entities/student";
import { loadUpcomingLessons } from "../../entities/lesson";

// Events
export const initializeApp = createEvent();

// Effects
export const initializeAppFx = createEffect(async () => {
  // Загружаем только студентов и предстоящие уроки
  await Promise.all([loadStudents(), loadUpcomingLessons()]);
});

// Stores
export const $appInitialized = createStore(false).on(
  initializeAppFx.doneData,
  () => true
);

export const $appInitializing = createStore(false)
  .on(initializeAppFx, () => true)
  .on(initializeAppFx.done, () => false)
  .on(initializeAppFx.fail, () => false);

// Connect events
initializeApp.watch(initializeAppFx);

// Handle errors
initializeAppFx.failData.watch((error) => {
  console.error("App initialization error:", error);
});
