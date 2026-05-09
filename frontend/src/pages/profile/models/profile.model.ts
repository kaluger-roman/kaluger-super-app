import { createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import { taxRatePeriodModel, userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";

import {
  PROFILE_SAVED_MESSAGE,
  extractProfileErrorMessage,
  getUserName,
  isUserDefined,
} from "./profile.helpers";
import type { ProfileTab } from "./profile.types";

// Gates
export const ProfilePageGate = createGate();

// Stores
export const $activeTab = createStore<ProfileTab>("personal");
export const $isEditMode = createStore<boolean>(false);
export const $name = createStore<string>("");

// Events
export const tabChanged = createEvent<ProfileTab>();
export const editRequested = createEvent();
export const editCancelled = createEvent();
export const nameChanged = createEvent<string>();
export const saveRequested = createEvent();

// Effects
export const updateProfileFx = createEffect(async ({ name }: { name: string }) =>
  authApi.updateProfile({ name }),
);

// Samples — load periods on gate open (Finances tab needs them)
sample({
  clock: ProfilePageGate.open,
  target: taxRatePeriodModel.periodsRequested,
});

// Samples — initialize $name from current user
sample({
  clock: [ProfilePageGate.open, userModel.$user],
  source: userModel.$user,
  filter: isUserDefined,
  fn: getUserName,
  target: $name,
});

// Samples — edit mode toggle
sample({
  clock: editRequested,
  fn: () => true,
  target: $isEditMode,
});

sample({
  clock: editCancelled,
  fn: () => false,
  target: $isEditMode,
});

// Samples — reset name on cancel
sample({
  clock: editCancelled,
  source: userModel.$user,
  filter: isUserDefined,
  fn: getUserName,
  target: $name,
});

// Samples — field updates
sample({
  clock: nameChanged,
  target: $name,
});

// Samples — save flow
sample({
  clock: saveRequested,
  source: $name,
  fn: (name) => ({ name }),
  target: updateProfileFx,
});

// Samples — handle save success / error
sample({
  clock: updateProfileFx.doneData,
  target: userModel.updateUser,
});

sample({
  clock: updateProfileFx.doneData,
  fn: () => false,
  target: $isEditMode,
});

sample({
  clock: updateProfileFx.doneData,
  fn: () => PROFILE_SAVED_MESSAGE,
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: updateProfileFx.failData,
  fn: extractProfileErrorMessage,
  target: notificationsModel.showErrorEvent,
});

// Samples — leave page = cancel edit, reset to personal tab
sample({
  clock: ProfilePageGate.close,
  target: editCancelled,
});

sample({
  clock: tabChanged,
  target: $activeTab,
});

sample({
  clock: ProfilePageGate.close,
  fn: (): ProfileTab => "personal",
  target: $activeTab,
});
