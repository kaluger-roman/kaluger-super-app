import { createStore, createEvent, createEffect, sample } from "effector";
import { interval, reset } from "patronum";

import { userModel } from "@entities";
import { authApi, notificationsModel } from "@shared";
import type { AuthResponse } from "@shared";

import { RESEND_TIMER_SECONDS } from "./changeEmail.constants";
import { extractAxiosError } from "./changeEmail.helpers";

// Stores
export const $isDialogOpen = createStore(false);
export const $newEmail = createStore("");
export const $password = createStore("");
export const $code = createStore("");
export const $error = createStore<string | null>(null);
export const $isCodeStep = createStore(false);
export const $canResend = createStore(true);
export const $resendTimer = createStore(0);

// Events
export const dialogOpened = createEvent();
export const dialogClosed = createEvent();
export const newEmailChanged = createEvent<string>();
export const passwordChanged = createEvent<string>();
export const codeChanged = createEvent<string>();
export const initiateSubmitted = createEvent();
export const verifySubmitted = createEvent();
export const resendRequested = createEvent();
export const formReset = createEvent();

const startResendTimer = createEvent();
const stopResendTimer = createEvent();

// Effects
export const changeEmailFx = createEffect(
  async (data: { newEmail: string; password: string }) => {
    return await authApi.changeEmail(data);
  },
);

export const verifyEmailChangeFx = createEffect(
  async (data: { code: string }) => {
    return await authApi.verifyEmailChange(data);
  },
);

export const resendEmailChangeCodeFx = createEffect(async () => {
  return await authApi.resendEmailChangeCode();
});

const persistTokenFx = createEffect((token: string) => {
  localStorage.setItem("authToken", token);
});

// Timer
const { tick: timerTick } = interval({
  timeout: 1000,
  start: startResendTimer,
  stop: stopResendTimer,
});

// Dialog open/close
sample({ clock: dialogOpened, fn: () => true, target: $isDialogOpen });
sample({ clock: dialogClosed, fn: () => false, target: $isDialogOpen });
sample({ clock: dialogClosed, target: formReset });

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

// On verify success — update user, token, and close dialog
sample({
  clock: verifyEmailChangeFx.doneData,
  fn: (response: AuthResponse & { token: string }) => response.user,
  target: userModel.updateUser,
});

sample({
  clock: verifyEmailChangeFx.doneData,
  filter: (response: AuthResponse & { token: string }) => !!response.token,
  fn: (response: AuthResponse & { token: string }) => response.token,
  target: [userModel.setAuthToken, persistTokenFx],
});

sample({
  clock: verifyEmailChangeFx.done,
  fn: () => "Email успешно изменён",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: verifyEmailChangeFx.done,
  target: dialogClosed,
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

// Reset form (including timer state)
reset({
  clock: formReset,
  target: [$newEmail, $password, $code, $error, $isCodeStep, $resendTimer, $canResend],
});

sample({ clock: formReset, target: stopResendTimer });

// Error handling
sample({ clock: changeEmailFx.failData, fn: extractAxiosError, target: $error });
sample({ clock: verifyEmailChangeFx.failData, fn: extractAxiosError, target: $error });
sample({ clock: resendEmailChangeCodeFx.failData, fn: extractAxiosError, target: $error });
