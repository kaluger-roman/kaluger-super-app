import { createStore, createEvent, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import { userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";

// Gates
export const ProfilePageGate = createGate();

// Stores
export const $isEditMode = createStore<boolean>(false);
export const $name = createStore<string>("");
export const $error = createStore<string>("");

// Events
export const editRequested = createEvent();
export const editCancelled = createEvent();
export const nameChanged = createEvent<string>();
export const saveRequested = createEvent();

// Effects
export const updateProfileFx = createEffect(async (name: string) => {
  return await authApi.updateProfile({ name });
});

// Samples

// Initialize name from current user
sample({
  clock: [ProfilePageGate.open, userModel.$user],
  source: userModel.$user,
  filter: (user): user is NonNullable<typeof user> => user !== null,
  fn: (user) => user?.name || "",
  target: $name,
});

// Enter edit mode
sample({
  clock: editRequested,
  fn: () => true,
  target: $isEditMode,
});

// Cancel editing
sample({
  clock: editCancelled,
  fn: () => false,
  target: $isEditMode,
});

// Reset name to original on cancel
sample({
  clock: editCancelled,
  source: userModel.$user,
  filter: (user): user is NonNullable<typeof user> => user !== null,
  fn: (user) => user?.name || "",
  target: $name,
});

// Reset error on cancel
sample({
  clock: editCancelled,
  fn: () => "",
  target: $error,
});

// Update name
sample({
  clock: nameChanged,
  target: $name,
});

// Reset error on name change
sample({
  clock: nameChanged,
  fn: () => "",
  target: $error,
});

// Save profile
sample({
  clock: saveRequested,
  source: $name,
  target: updateProfileFx,
});

// Handle success
sample({
  clock: updateProfileFx.doneData,
  fn: (user) => user,
  target: userModel.updateUser,
});

// Exit edit mode on success
sample({
  clock: updateProfileFx.doneData,
  fn: () => false,
  target: $isEditMode,
});

// Show success notification
sample({
  clock: updateProfileFx.doneData,
  fn: () => "Профиль успешно обновлён",
  target: notificationsModel.showSuccessEvent,
});

// Handle errors
sample({
  clock: updateProfileFx.failData,
  fn: (error) => error.message || "Не удалось обновить профиль",
  target: notificationsModel.showErrorEvent,
});

// Reset edit mode and state when leaving the page
sample({
  clock: ProfilePageGate.close,
  target: editCancelled,
});
