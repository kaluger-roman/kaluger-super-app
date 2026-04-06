import { createStore, createEvent, createEffect, sample } from "effector";

import { authApi, notificationsModel } from "@shared";

// Events
export const currentPasswordChanged = createEvent<string>();
export const newPasswordChanged = createEvent<string>();
export const confirmPasswordChanged = createEvent<string>();
export const formSubmitted = createEvent();
export const formReset = createEvent();

// Effects
export const changePasswordFx = createEffect(
  async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    return await authApi.changePassword(data);
  },
);

// Stores
export const $currentPassword = createStore("");
export const $newPassword = createStore("");
export const $confirmPassword = createStore("");
export const $error = createStore<string | null>(null);
export const $isLoading = changePasswordFx.pending;

// Update fields
sample({ clock: currentPasswordChanged, target: $currentPassword });
sample({ clock: newPasswordChanged, target: $newPassword });
sample({ clock: confirmPasswordChanged, target: $confirmPassword });

// Clear error on any field change
sample({
  clock: [currentPasswordChanged, newPasswordChanged, confirmPasswordChanged],
  fn: () => null,
  target: $error,
});

// Reset form
sample({
  clock: formReset,
  fn: () => "",
  target: [$currentPassword, $newPassword, $confirmPassword],
});

sample({
  clock: formReset,
  fn: () => null,
  target: $error,
});

// Submit
sample({
  clock: formSubmitted,
  source: {
    currentPassword: $currentPassword,
    newPassword: $newPassword,
    confirmPassword: $confirmPassword,
  },
  target: changePasswordFx,
});

// Success
sample({
  clock: changePasswordFx.doneData,
  fn: () => "Пароль успешно изменён",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: changePasswordFx.done,
  target: formReset,
});

// Error
sample({
  clock: changePasswordFx.failData,
  fn: (error) => {
    const axiosError = error as unknown as {
      response?: { data?: { error?: string } };
      message: string;
    };
    return axiosError?.response?.data?.error || axiosError?.message || "Ошибка при смене пароля";
  },
  target: $error,
});
