import { createStore, createEvent, sample } from "effector";
import { createGate } from "effector-react";

export const LoginFormGate = createGate();

export const $email = createStore("");
export const $password = createStore("");

export const emailChanged = createEvent<string>();
export const passwordChanged = createEvent<string>();
export const formReset = createEvent();

sample({
  clock: emailChanged,
  target: $email,
});

sample({
  clock: passwordChanged,
  target: $password,
});

sample({
  clock: formReset,
  fn: () => "",
  target: [$email, $password],
});

sample({
  clock: LoginFormGate.close,
  target: formReset,
});
