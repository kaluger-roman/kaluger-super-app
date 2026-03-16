import { createStore, createEvent, createEffect, sample } from "effector";

import { lessonModel, newsModel, notificationsModel, studentModel, userModel } from "@entities";

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

export const registerServiceWorkerFx = createEffect(async () => {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/push-sw.js");
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
});

// Stores
export const $appInitialized = createStore(false);

export const $appInitializing = initializeAppFx.pending;

// Online/offline detection
export const onlineStatusChanged = createEvent<boolean>();

export const $isOnline = createStore(true);

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

// Register service worker on app init
sample({
  clock: initializeAppFx.doneData,
  target: registerServiceWorkerFx,
});

// Forward SW registration to notifications model
sample({
  clock: registerServiceWorkerFx.doneData,
  target: notificationsModel.serviceWorkerRegistered,
});

// Load VAPID key and settings for authenticated users after SW registration
sample({
  clock: registerServiceWorkerFx.doneData,
  source: userModel.$isAuthenticated,
  filter: (isAuthenticated) => isAuthenticated,
  target: [notificationsModel.loadVapidKeyFx, notificationsModel.loadSettings],
});

// Check unread news only for authenticated users
sample({
  clock: initializeAppFx.doneData,
  source: userModel.$isAuthenticated,
  filter: (isAuthenticated) => isAuthenticated,
  target: newsModel.checkUnread,
});

// Online/offline status
sample({
  clock: onlineStatusChanged,
  target: $isOnline,
});

// Handle errors — still mark app as initialized so user can reach login page
sample({
  clock: initializeAppFx.failData,
  fn: () => true,
  target: $appInitialized,
});
