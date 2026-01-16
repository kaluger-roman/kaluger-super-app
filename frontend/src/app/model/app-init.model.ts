import { createStore, createEvent, createEffect, sample } from "effector";

import { lessonModel, studentModel } from "@entities";

import type { InitializeAppParams } from "./app-init.types";

export const initializeApp = createEvent<InitializeAppParams>();

// Effects
export const initializeAppFx = createEffect(
  async ({ onlyUnpaid = false, onlyWithoutHomework = false }: InitializeAppParams) =>
    Promise.all([
      studentModel.loadStudents(),
      lessonModel.loadUpcomingLessons({ onlyUnpaid, onlyWithoutHomework }),
    ])
);

// Stores
export const $appInitialized = createStore(false);

export const $appInitializing = initializeAppFx.pending;

// Connect events
sample({
  clock: initializeApp,
  target: initializeAppFx,
});

sample({
  clock: initializeAppFx.doneData,
  fn: () => true,
  target: $appInitialized,
});

// Handle errors
sample({
  clock: initializeAppFx.failData,
  fn: (error) => {
    console.error("App initialization error:", error);
  },
});
