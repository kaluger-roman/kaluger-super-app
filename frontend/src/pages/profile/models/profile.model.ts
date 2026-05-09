import { createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import { taxRatePeriodModel, userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";

import {
  NO_PERIODS_ERROR,
  PROFILE_SAVED_MESSAGE,
  buildUpdateProfilePayload,
  extractProfileErrorMessage,
  getUserName,
  getUserTaxEnabled,
  isTaxEnabledWithoutPeriods,
  isUserDefined,
} from "./profile.helpers";

// Gates
export const ProfilePageGate = createGate();

// Stores
export const $isEditMode = createStore<boolean>(false);
export const $name = createStore<string>("");
export const $taxEnabled = createStore<boolean>(false);
export const $error = createStore<string>("");

// Events
export const editRequested = createEvent();
export const editCancelled = createEvent();
export const nameChanged = createEvent<string>();
export const taxEnabledToggled = createEvent<boolean>();
export const saveRequested = createEvent();

// Effects
export const updateProfileFx = createEffect(
  async ({ name, taxEnabled }: { name: string; taxEnabled: boolean }) =>
    authApi.updateProfile({ name, taxEnabled }),
);

// Samples — load periods on gate open
sample({
  clock: ProfilePageGate.open,
  target: taxRatePeriodModel.periodsRequested,
});

// Samples — initialize editable fields from current user
sample({
  clock: [ProfilePageGate.open, userModel.$user],
  source: userModel.$user,
  filter: isUserDefined,
  fn: getUserName,
  target: $name,
});

sample({
  clock: [ProfilePageGate.open, userModel.$user],
  source: userModel.$user,
  filter: isUserDefined,
  fn: getUserTaxEnabled,
  target: $taxEnabled,
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

// Samples — reset fields on cancel
sample({
  clock: editCancelled,
  source: userModel.$user,
  filter: isUserDefined,
  fn: getUserName,
  target: $name,
});

sample({
  clock: editCancelled,
  source: userModel.$user,
  filter: isUserDefined,
  fn: getUserTaxEnabled,
  target: $taxEnabled,
});

sample({
  clock: editCancelled,
  fn: () => "",
  target: $error,
});

// Samples — field updates
sample({
  clock: nameChanged,
  target: $name,
});

sample({
  clock: taxEnabledToggled,
  target: $taxEnabled,
});

sample({
  clock: nameChanged,
  fn: () => "",
  target: $error,
});

sample({
  clock: taxEnabledToggled,
  fn: () => "",
  target: $error,
});

// Samples — save flow with guard for tax-without-periods
sample({
  clock: saveRequested,
  source: { taxEnabled: $taxEnabled, periods: taxRatePeriodModel.$periods },
  filter: isTaxEnabledWithoutPeriods,
  fn: () => NO_PERIODS_ERROR,
  target: [$error, notificationsModel.showErrorEvent],
});

sample({
  clock: saveRequested,
  source: {
    name: $name,
    taxEnabled: $taxEnabled,
    periods: taxRatePeriodModel.$periods,
  },
  filter: (payload) => !isTaxEnabledWithoutPeriods(payload),
  fn: buildUpdateProfilePayload,
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

// Samples — leave page = cancel edit
sample({
  clock: ProfilePageGate.close,
  target: editCancelled,
});
