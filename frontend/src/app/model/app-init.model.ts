import { createStore, createEvent, createEffect, sample } from "effector";

import {
  lessonModel,
  newsModel,
  notificationsModel,
  studentModel,
  studentUserModel,
  userModel,
} from "@entities";
import { loginFormModel } from "@features/auth";
import { isIos, isInStandaloneMode } from "@shared";

import type { InitializeAppParams, BeforeInstallPromptEvent } from "./app-init.types";

export const initializeApp = createEvent<InitializeAppParams>();
export const appBootedUnauthenticated = createEvent();

// Effects
// Awaits the effects themselves, not the loadStudents/loadUpcomingLessons
// events: an event call resolves instantly, which flipped $appInitialized
// before the data landed and stacked the route-chunk and $isBlocking
// backdrops on top of each other at startup.
export const initializeAppFx = createEffect(
  async ({ onlyUnpaid = false, onlyWithoutHomework = false }: InitializeAppParams) =>
    Promise.all([
      studentModel.loadActiveStudentsFx(),
      studentModel.loadArchivedStudentsFx(),
      lessonModel.loadUpcomingLessonsFx({ onlyUnpaid, onlyWithoutHomework }),
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

// PWA resume — refresh data when app returns to foreground
export const appResumed = createEvent();

// Online/offline detection
export const onlineStatusChanged = createEvent<boolean>();

export const $isOnline = createStore(typeof navigator !== "undefined" ? navigator.onLine : true);

// PWA install prompt
export const installPromptCaptured = createEvent<BeforeInstallPromptEvent>();
export const installPromptDismissed = createEvent();

export const $installPrompt = createStore<BeforeInstallPromptEvent | null>(null);
export const $showInstallBanner = createStore(false);

export const $showIosInstallHint = createStore(
  isIos() && !isInStandaloneMode()
);
export const iosInstallHintDismissed = createEvent();

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

// Register service worker on app init. `finally`, not `doneData`: now that
// initializeAppFx really awaits boot requests it can fail, and a failed
// lessons/students fetch must not skip SW registration or the news check.
sample({
  clock: initializeAppFx.finally,
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
  clock: initializeAppFx.finally,
  source: userModel.$isAuthenticated,
  filter: (isAuthenticated) => isAuthenticated,
  target: newsModel.checkUnread,
});

// Online/offline status
sample({
  clock: onlineStatusChanged,
  target: $isOnline,
});

// PWA install prompt
sample({
  clock: installPromptCaptured,
  target: $installPrompt,
});

sample({
  clock: installPromptCaptured,
  fn: () => true,
  target: $showInstallBanner,
});

sample({
  clock: installPromptDismissed,
  fn: () => false,
  target: $showInstallBanner,
});

sample({
  clock: iosInstallHintDismissed,
  fn: () => false,
  target: $showIosInstallHint,
});

// Refresh data when PWA resumes from background
sample({
  clock: appResumed,
  source: userModel.$isAuthenticated,
  filter: (isAuthenticated) => isAuthenticated,
  target: initializeAppFx.prepend(() => ({})),
});

sample({
  clock: appResumed,
  source: userModel.$isAuthenticated,
  filter: (isAuthenticated) => isAuthenticated,
  target: [notificationsModel.loadSettings, newsModel.checkUnread],
});

// Handle errors — still mark app as initialized so user can reach login page
sample({
  clock: initializeAppFx.failData,
  fn: () => true,
  target: $appInitialized,
});

// After successful login, load app data. On first mount without a token we
// skip initializeApp entirely (to avoid unauthenticated requests that 401)
// and only mark the app as ready so the login screen can render.
sample({
  clock: loginFormModel.loginFx.doneData,
  fn: (): InitializeAppParams => ({}),
  target: initializeApp,
});

sample({
  clock: appBootedUnauthenticated,
  fn: () => true,
  target: $appInitialized,
});

// Boot-time orchestration. App.tsx kicks off the right session-hydration
// effect; this model decides when to consider the app ready.
//
// - Tutor: profile loaded → kick off tutor data load (initializeAppFx);
//   profile failed → skip data load, mark ready so the redirect (handled
//   by the 401 axios interceptor) lands on /login without a stuck spinner.
// - Student: any settle (done|fail) marks the app ready. Tutor data load
//   is NOT triggered — student JWT would 401 the tutor endpoints and the
//   interceptor would force-redirect, breaking the student cabinet.
sample({
  clock: userModel.getProfileFx.done,
  fn: (): InitializeAppParams => ({}),
  target: initializeApp,
});

sample({
  clock: userModel.getProfileFx.fail,
  fn: () => true,
  target: $appInitialized,
});

sample({
  clock: studentUserModel.getCurrentStudentFx.finally,
  fn: () => true,
  target: $appInitialized,
});
