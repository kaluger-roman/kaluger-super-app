import { createStore, createEvent, createEffect, sample } from "effector";

import { authApi } from "@shared";

import { extractAxiosError, mapVerifyTokenError } from "./resetPassword.helpers";
import type { TokenStatus } from "./resetPassword.types";

export const $token = createStore("");
export const $tokenStatus = createStore<TokenStatus>("idle");
export const $tokenError = createStore<string | null>(null);
export const $newPassword = createStore("");
export const $confirmPassword = createStore("");
export const $error = createStore<string | null>(null);
export const $isSuccess = createStore(false);

export const tokenSet = createEvent<string>();
export const newPasswordChanged = createEvent<string>();
export const confirmPasswordChanged = createEvent<string>();
export const formSubmitted = createEvent();
export const formReset = createEvent();

export const verifyResetTokenFx = createEffect(
  async ({ token }: { token: string }) => authApi.verifyResetToken({ token }),
);

export const resetPasswordFx = createEffect(
  async ({
    token,
    newPassword,
    confirmPassword,
  }: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }) => authApi.resetPassword({ token, newPassword, confirmPassword }),
);

export const $isVerifying = verifyResetTokenFx.pending;
export const $isSubmitting = resetPasswordFx.pending;

sample({ clock: tokenSet, target: $token });
sample({ clock: tokenSet, fn: () => "checking" as TokenStatus, target: $tokenStatus });
sample({ clock: tokenSet, fn: () => null, target: $tokenError });

sample({
  clock: tokenSet,
  filter: (token) => token.trim().length > 0,
  fn: (token) => ({ token }),
  target: verifyResetTokenFx,
});

sample({
  clock: tokenSet,
  filter: (token) => token.trim().length === 0,
  fn: () => "invalid_unknown" as TokenStatus,
  target: $tokenStatus,
});

sample({
  clock: verifyResetTokenFx.done,
  fn: () => "valid" as TokenStatus,
  target: $tokenStatus,
});

sample({
  clock: verifyResetTokenFx.failData,
  fn: (error) => mapVerifyTokenError(error).status,
  target: $tokenStatus,
});

sample({
  clock: verifyResetTokenFx.failData,
  fn: (error) => mapVerifyTokenError(error).message,
  target: $tokenError,
});

sample({ clock: newPasswordChanged, target: $newPassword });
sample({ clock: confirmPasswordChanged, target: $confirmPassword });
sample({
  clock: [newPasswordChanged, confirmPasswordChanged],
  fn: () => null,
  target: $error,
});

sample({
  clock: formSubmitted,
  source: { token: $token, newPassword: $newPassword, confirmPassword: $confirmPassword },
  filter: ({ token, newPassword, confirmPassword }) =>
    token.length > 0 && newPassword.length > 0 && confirmPassword.length > 0,
  target: resetPasswordFx,
});

sample({ clock: resetPasswordFx.done, fn: () => true, target: $isSuccess });

sample({
  clock: resetPasswordFx.failData,
  fn: extractAxiosError,
  target: $error,
});

sample({ clock: formReset, fn: () => "", target: [$token, $newPassword, $confirmPassword] });
sample({ clock: formReset, fn: () => "idle" as TokenStatus, target: $tokenStatus });
sample({ clock: formReset, fn: () => null, target: [$tokenError, $error] });
sample({ clock: formReset, fn: () => false, target: $isSuccess });
