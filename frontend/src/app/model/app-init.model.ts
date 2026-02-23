import { createStore, createEvent, createEffect, sample } from "effector";

import { lessonModel, newsModel, studentModel, userModel } from "@entities";

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

// Check unread news only for authenticated users
sample({
  clock: initializeAppFx.doneData,
  source: userModel.$isAuthenticated,
  filter: (isAuthenticated) => isAuthenticated,
  target: newsModel.checkUnread,
});

// Handle errors
sample({
  clock: initializeAppFx.failData,
  fn: (error) => {
    console.error("App initialization error:", error);
  },
});
