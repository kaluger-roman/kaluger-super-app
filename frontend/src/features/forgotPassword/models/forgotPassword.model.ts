import { createStore, createEvent, createEffect, sample } from "effector";

import { authApi } from "@shared";

import { extractAxiosError } from "./forgotPassword.helpers";

export const $email = createStore("");
export const $isSent = createStore(false);
export const $successMessage = createStore<string | null>(null);
export const $error = createStore<string | null>(null);

export const emailChanged = createEvent<string>();
export const formSubmitted = createEvent();
export const formReset = createEvent();

export const forgotPasswordFx = createEffect(
  async ({ email }: { email: string }) => authApi.forgotPassword({ email }),
);

export const $isLoading = forgotPasswordFx.pending;

sample({ clock: emailChanged, target: $email });

sample({ clock: emailChanged, fn: () => null, target: $error });

sample({
  clock: formSubmitted,
  source: { email: $email },
  filter: ({ email }) => email.trim().length > 0,
  target: forgotPasswordFx,
});

sample({
  clock: forgotPasswordFx.doneData,
  fn: ({ message }) => message,
  target: $successMessage,
});

sample({ clock: forgotPasswordFx.done, fn: () => true, target: $isSent });

sample({
  clock: forgotPasswordFx.failData,
  fn: extractAxiosError,
  target: $error,
});

sample({ clock: formReset, fn: () => "", target: $email });
sample({ clock: formReset, fn: () => false, target: $isSent });
sample({ clock: formReset, fn: () => null, target: [$error, $successMessage] });
