import { createEffect, createEvent, sample } from "effector";

import { notificationsModel, studentUserModel, userModel } from "@entities";

import { LOGOUT_CLEANUP_TIMEOUT_MS } from "./sessionCleanup.constants";
import { removeDeviceSubscription, withTimeout } from "./sessionCleanup.helpers";
import type { CleanupParams, SessionRole } from "./sessionCleanup.types";

export const tutorLogoutConfirmed = createEvent();
export const studentLogoutRequested = createEvent();
// Fires once per logout, before the session's token is dropped: the app ends a call in progress.
export const logoutStarted = createEvent<SessionRole>();

// Never fails: the logout happens whatever the cleanup managed to do.
export const cleanupFx = createEffect(async (params: CleanupParams): Promise<void> => {
  try {
    await withTimeout(removeDeviceSubscription(params), LOGOUT_CLEANUP_TIMEOUT_MS);
  } catch {
    // Best effort.
  }
});

sample({
  clock: tutorLogoutConfirmed,
  source: cleanupFx.pending,
  filter: (pending) => !pending,
  fn: (): SessionRole => "tutor",
  target: logoutStarted,
});
sample({
  clock: studentLogoutRequested,
  source: cleanupFx.pending,
  filter: (pending) => !pending,
  fn: (): SessionRole => "student",
  target: logoutStarted,
});

sample({
  clock: logoutStarted,
  source: notificationsModel.$serviceWorkerRegistration,
  fn: (registration, role): CleanupParams => ({ role, registration }),
  target: cleanupFx,
});

sample({
  clock: cleanupFx.finally,
  filter: ({ params }) => params.role === "tutor",
  fn: () => undefined,
  target: userModel.logoutUser,
});
sample({
  clock: cleanupFx.finally,
  filter: ({ params }) => params.role === "student",
  fn: () => undefined,
  target: studentUserModel.studentLoggedOut,
});
