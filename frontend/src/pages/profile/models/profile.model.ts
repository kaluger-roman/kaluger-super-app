import type { AxiosError } from "axios";
import { createStore, createEvent, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import { userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";

import type { ProfileTab } from "./profile.types";

// Gates
export const ProfilePageGate = createGate();

// Stores
export const $activeTab = createStore<ProfileTab>("personal");
export const $isEditMode = createStore<boolean>(false);
export const $name = createStore<string>("");
export const $taxRateInput = createStore<string>("6");
export const $error = createStore<string>("");

// Events
export const tabChanged = createEvent<ProfileTab>();
export const editRequested = createEvent();
export const editCancelled = createEvent();
export const nameChanged = createEvent<string>();
export const taxRateInputChanged = createEvent<string>();
export const saveRequested = createEvent();

// Effects
export const updateProfileFx = createEffect(
  async ({ name, taxRate }: { name: string; taxRate: number }) => {
    return await authApi.updateProfile({ name, taxRate });
  }
);

// Samples

// Initialize name from current user
sample({
  clock: [ProfilePageGate.open, userModel.$user],
  source: userModel.$user,
  filter: (user): user is NonNullable<typeof user> => user !== null,
  fn: (user) => user?.name || "",
  target: $name,
});

// Initialize taxRateInput from current user
sample({
  clock: [ProfilePageGate.open, userModel.$user],
  source: userModel.$user,
  filter: (user): user is NonNullable<typeof user> => user !== null,
  fn: (user) => String(user?.taxRate ?? 6),
  target: $taxRateInput,
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

// Reset taxRateInput to original on cancel
sample({
  clock: editCancelled,
  source: userModel.$user,
  filter: (user): user is NonNullable<typeof user> => user !== null,
  fn: (user) => String(user?.taxRate ?? 6),
  target: $taxRateInput,
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

// Update taxRateInput
sample({
  clock: taxRateInputChanged,
  target: $taxRateInput,
});

// Reset error on name change
sample({
  clock: nameChanged,
  fn: () => "",
  target: $error,
});

// Reset error on taxRate change
sample({
  clock: taxRateInputChanged,
  fn: () => "",
  target: $error,
});

// Save profile — parse taxRateInput to number before sending
sample({
  clock: saveRequested,
  source: { name: $name, taxRateInput: $taxRateInput },
  fn: ({ name, taxRateInput }) => ({
    name,
    taxRate: parseFloat(taxRateInput) || 0,
  }),
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

// Handle errors — extract server message from axios response
sample({
  clock: updateProfileFx.failData,
  fn: (error) => {
    const axiosError = error as AxiosError<{ error: string }>;
    return axiosError.response?.data?.error || error.message || "Не удалось обновить профиль";
  },
  target: notificationsModel.showErrorEvent,
});

// Reset edit mode and state when leaving the page
sample({
  clock: ProfilePageGate.close,
  target: editCancelled,
});

// Change active tab
sample({
  clock: tabChanged,
  target: $activeTab,
});

// Reset to personal tab when leaving the page
sample({
  clock: ProfilePageGate.close,
  fn: (): ProfileTab => "personal",
  target: $activeTab,
});
