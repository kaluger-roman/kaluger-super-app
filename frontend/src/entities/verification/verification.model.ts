import { createStore, createEvent, createEffect, sample, combine } from "effector";
import { createGate } from "effector-react";
import { interval } from "patronum";

import { authApi, EMAIL_VERIFICATION_CODE_LENGTH } from "@shared";

import { RESEND_TIMER_SECONDS, VERIFICATION_EMAIL_KEY } from "./verification.constants";

export const VerificationGate = createGate();

export const verifyEmail = createEvent<{ email: string; code: string }>();
export const resendVerification = createEvent<{ email: string }>();
export const clearVerificationError = createEvent();
export const setVerificationEmail = createEvent<string | null>();
export const codeChanged = createEvent<string>();
export const verifyCode = createEvent();
export const resendCode = createEvent();

const startResendTimer = createEvent();
const stopResendTimer = createEvent();

export const verifyEmailFx = createEffect(
  async ({ email, code }: { email: string; code: string }) => {
    const response = await authApi.verifyEmail({ email, code });
    if (response.token) {
      localStorage.setItem("authToken", response.token);
    }
    localStorage.removeItem(VERIFICATION_EMAIL_KEY);
    return response;
  }
);

export const resendVerificationFx = createEffect(async ({ email }: { email: string }) => {
  return await authApi.resendVerification({ email });
});

export const $verificationEmail = createStore<string | null>(
  localStorage.getItem(VERIFICATION_EMAIL_KEY)
);

export const $verificationCode = createStore("");
export const $canResend = createStore(true);
export const $resendTimer = createStore(0);

export const $verificationIsLoading = combine(
  verifyEmailFx.pending,
  resendVerificationFx.pending,
  (verify, resend) => verify || resend
);

export const $verificationError = createStore<string | null>(null);

const { tick: timerTick } = interval({
  timeout: 1000,
  start: startResendTimer,
  stop: stopResendTimer,
});

sample({
  clock: codeChanged,
  target: $verificationCode,
});

sample({
  clock: verifyEmail,
  target: verifyEmailFx,
});

sample({
  clock: resendVerification,
  target: resendVerificationFx,
});

sample({
  clock: verifyCode,
  source: { email: $verificationEmail, code: $verificationCode },
  filter: ({ email, code }) => email !== null && code.length === EMAIL_VERIFICATION_CODE_LENGTH,
  fn: ({ email, code }) => ({ email: email as string, code }),
  target: verifyEmailFx,
});

sample({
  clock: resendCode,
  source: $verificationEmail,
  filter: (email): email is string => email !== null,
  target: resendVerificationFx.prepend((email: string) => ({ email })),
});

sample({
  clock: $verificationCode,
  filter: (code) => code.length === EMAIL_VERIFICATION_CODE_LENGTH,
  target: verifyCode,
});

sample({
  clock: resendVerificationFx.done,
  target: startResendTimer,
});

sample({
  clock: startResendTimer,
  fn: () => RESEND_TIMER_SECONDS,
  target: $resendTimer,
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
  target: [stopResendTimer, $canResend.reinit],
});

sample({
  clock: startResendTimer,
  fn: () => false,
  target: $canResend,
});

sample({
  clock: [verifyEmailFx.failData, resendVerificationFx.failData],
  fn: (error) => {
    const axiosError = error as unknown as {
      response?: { data?: { error?: string } };
      message: string;
    };
    return axiosError?.response?.data?.error || axiosError?.message || "Произошла ошибка";
  },
  target: $verificationError,
});

sample({
  clock: [verifyEmailFx, resendVerificationFx, clearVerificationError],
  fn: () => null,
  target: $verificationError,
});

sample({
  clock: setVerificationEmail,
  fn: (email) => {
    if (email) {
      localStorage.setItem(VERIFICATION_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(VERIFICATION_EMAIL_KEY);
    }
    return email;
  },
  target: $verificationEmail,
});

sample({
  clock: VerificationGate.open,
  target: clearVerificationError,
});

sample({
  clock: [VerificationGate.close, verifyEmailFx.done],
  fn: () => "",
  target: $verificationCode,
});

sample({
  clock: verifyEmailFx.done,
  fn: () => null,
  target: $verificationEmail,
});
