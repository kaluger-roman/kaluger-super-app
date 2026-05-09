import { createStore, createEvent, sample } from "effector";

import { userModel } from "@entities";

// Stores
export const $isDialogOpen = createStore<boolean>(false);

// Events
export const logoutRequested = createEvent();
export const logoutConfirmed = createEvent();
export const logoutCancelled = createEvent();

// Open/close dialog
sample({
  clock: logoutRequested,
  fn: () => true,
  target: $isDialogOpen,
});

sample({
  clock: [logoutConfirmed, logoutCancelled],
  fn: () => false,
  target: $isDialogOpen,
});

// Trigger actual logout only on confirm
sample({
  clock: logoutConfirmed,
  target: userModel.logoutUser,
});
