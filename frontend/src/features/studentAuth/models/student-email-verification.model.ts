import { createEffect, createEvent, createStore, sample } from "effector";
import { interval } from "patronum";

import { studentUserModel } from "@entities";
import type { StudentSession } from "@shared";
import { studentAuthApi } from "@shared";

import { extractAxiosError } from "./student-auth.helpers";

export const $code = createStore<string>("");
export const codeChanged = createEvent<string>();
export const $verifyError = createStore<string | null>(null);
export const $resendError = createStore<string | null>(null);
export const $resendCooldownSeconds = createStore<number>(0);
export const codeSubmitted = createEvent();
export const resendRequested = createEvent();
export const cooldownTick = createEvent();
export const cooldownStarted = createEvent();
export const cooldownEnded = createEvent();

export const verifyEmailFx = createEffect(
  async (code: string): Promise<StudentSession> => studentAuthApi.verifyEmail(code)
);

export const resendVerificationFx = createEffect(async () => studentAuthApi.resendVerification());

export const $isVerifying = verifyEmailFx.pending;
export const $isResending = resendVerificationFx.pending;

sample({ clock: codeChanged, target: $code });
sample({ clock: codeChanged, fn: () => null, target: $verifyError });

sample({
  clock: codeSubmitted,
  source: $code,
  filter: (code) => /^[0-9]{6}$/.test(code),
  target: verifyEmailFx,
});

sample({
  clock: codeSubmitted,
  source: $code,
  filter: (code) => !/^[0-9]{6}$/.test(code),
  fn: () => "Введите 6-значный код",
  target: $verifyError,
});

sample({
  clock: verifyEmailFx.doneData,
  target: studentUserModel.studentSessionUpdated,
});

sample({ clock: verifyEmailFx.failData, fn: extractAxiosError, target: $verifyError });

sample({ clock: resendRequested, target: resendVerificationFx });
sample({ clock: resendRequested, fn: () => null, target: $resendError });

sample({
  clock: resendVerificationFx.done,
  fn: () => 60,
  target: $resendCooldownSeconds,
});

sample({
  clock: resendVerificationFx.failData,
  fn: extractAxiosError,
  target: $resendError,
});

export const { tick: cooldownIntervalTick, isRunning: $isCooldownRunning } = interval({
  timeout: 1000,
  start: cooldownStarted,
  stop: cooldownEnded,
});

sample({ clock: cooldownIntervalTick, target: cooldownTick });

sample({ clock: resendVerificationFx.done, target: cooldownStarted });

sample({
  clock: cooldownTick,
  source: $resendCooldownSeconds,
  fn: (seconds) => Math.max(0, seconds - 1),
  target: $resendCooldownSeconds,
});

sample({
  clock: $resendCooldownSeconds,
  filter: (seconds) => seconds === 0,
  target: cooldownEnded,
});
