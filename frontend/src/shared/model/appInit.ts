import { createStore, createEvent, createEffect } from "effector";
import { loadStudents } from "../../entities/student";
import { loadLessons, loadUpcomingLessons } from "../../entities/lesson";

// Events
export const initializeApp = createEvent();

// Effects
export const initializeAppFx = createEffect(async () => {
  // Загружаем данные параллельно
  await Promise.all([loadStudents(), loadLessons({}), loadUpcomingLessons()]);

  // Обновляем статусы уроков после загрузки
  setTimeout(() => {
    loadLessons({});
    loadUpcomingLessons();
  }, 1000);
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
