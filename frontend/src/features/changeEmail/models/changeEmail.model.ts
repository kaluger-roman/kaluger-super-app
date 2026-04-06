import { createStore, createEvent, createEffect, sample } from "effector";
import { interval } from "patronum";

import { userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";
import type { AuthResponse } from "@shared";

const RESEND_TIMER_SECONDS = 60;

// Events
export const newEmailChanged = createEvent<string>();
export const passwordChanged = createEvent<string>();
export const codeChanged = createEvent<string>();
export const initiateSubmitted = createEvent();
export const verifySubmitted = createEvent();
export const resendRequested = createEvent();
export const formReset = createEvent();
export const cancelRequested = createEvent();

// Effects
export const changeEmailFx = createEffect(
  async (data: { newEmail: string; password: string }) => {
    return await authApi.changeEmail(data);
  },
);

export const verifyEmailChangeFx = createEffect(
  async (data: { code: string }) => {
    const response = await authApi.verifyEmailChange(data);
    if (response.token) {
      localStorage.setItem("authToken", response.token);
    }
    return response;
  },
);

export const resendEmailChangeCodeFx = createEffect(async () => {
  return await authApi.resendEmailChangeCode();
});

// Stores
export const $newEmail = createStore("");
export const $password = createStore("");
export const $code = createStore("");
export const $error = createStore<string | null>(null);
export const $isCodeStep = createStore(false);
export const $isLoading = createStore(false);
export const $canResend = createStore(true);
export const $resendTimer = createStore(0);

// Timer
const startResendTimer = createEvent();
const stopResendTimer = createEvent();

const { tick: timerTick } = interval({
  timeout: 1000,
  start: startResendTimer,
  stop: stopResendTimer,
});

// Loading derived from multiple effects
sample({
  clock: [changeEmailFx, verifyEmailChangeFx, resendEmailChangeCodeFx],
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: [
    changeEmailFx.done,
    changeEmailFx.fail,
    verifyEmailChangeFx.done,
    verifyEmailChangeFx.fail,
    resendEmailChangeCodeFx.done,
    resendEmailChangeCodeFx.fail,
  ],
  fn: () => false,
  target: $isLoading,
});

// Update fields
sample({ clock: newEmailChanged, target: $newEmail });
sample({ clock: passwordChanged, target: $password });
sample({ clock: codeChanged, target: $code });

// Clear error on field change
sample({
  clock: [newEmailChanged, passwordChanged, codeChanged],
  fn: () => null,
  target: $error,
});

// Submit initiate
sample({
  clock: initiateSubmitted,
  source: { newEmail: $newEmail, password: $password },
  target: changeEmailFx,
});

// On initiate success — move to code step
sample({
  clock: changeEmailFx.done,
  fn: () => true,
  target: $isCodeStep,
});

sample({
  clock: changeEmailFx.done,
  target: startResendTimer,
});

// Submit verify
sample({
  clock: verifySubmitted,
  source: $code,
  fn: (code) => ({ code }),
  target: verifyEmailChangeFx,
});

// On verify success — update user and reset
sample({
  clock: verifyEmailChangeFx.doneData,
  fn: (response: AuthResponse & { token: string }) => response.user,
  target: userModel.updateUser,
});

sample({
  clock: verifyEmailChangeFx.doneData,
  fn: (response: AuthResponse & { token: string }) => response.token,
  target: userModel.setAuthToken,
});

sample({
  clock: verifyEmailChangeFx.done,
  fn: () => "Email успешно изменён",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: verifyEmailChangeFx.done,
  target: formReset,
});

// Resend
sample({
  clock: resendRequested,
  target: resendEmailChangeCodeFx,
});

sample({
  clock: resendEmailChangeCodeFx.done,
  target: startResendTimer,
});

// Timer logic
sample({
  clock: startResendTimer,
  fn: () => RESEND_TIMER_SECONDS,
  target: $resendTimer,
});

sample({
  clock: startResendTimer,
  fn: () => false,
  target: $canResend,
});

sample({
  clock: timerTick,
  source: $resendTimer,
  filter: (timer) => timer > 0,
  fn: (timer) => timer - 1,
  target: $resendTimer,
});

sample({
  clock: $resendTimer,
  filter: (timer) => timer === 0,
  fn: () => true,
  target: $canResend,
});

sample({
  clock: $resendTimer,
  filter: (timer) => timer === 0,
  target: stopResendTimer,
});

// Cancel — go back to initial form
sample({
  clock: cancelRequested,
  target: formReset,
});

// Reset form
sample({
  clock: formReset,
  fn: () => "",
  target: [$newEmail, $password, $code],
});

sample({
  clock: formReset,
  fn: () => null,
  target: $error,
});

sample({
  clock: formReset,
  fn: () => false,
  target: $isCodeStep,
});

// Error handling
const extractError = (error: unknown): string => {
  const axiosError = error as {
    response?: { data?: { error?: string } };
    message: string;
  };
  return axiosError?.response?.data?.error || axiosError?.message || "Произошла ошибка";
};

sample({
  clock: changeEmailFx.failData,
  fn: extractError,
  target: $error,
});

sample({
  clock: verifyEmailChangeFx.failData,
  fn: extractError,
  target: $error,
});

sample({
  clock: resendEmailChangeCodeFx.failData,
  fn: extractError,
  target: $error,
});
