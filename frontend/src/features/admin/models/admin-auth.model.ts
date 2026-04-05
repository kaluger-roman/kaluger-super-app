import { createStore, createEvent, createEffect, sample } from "effector";

import { adminApiMethods, adminTokenInvalidated, ADMIN_TOKEN_KEY } from "@shared";

// Stores
export const $adminToken = createStore<string | null>(null);
export const $isAdminAuthenticated = $adminToken.map(
  (token) => token !== null
);
export const $loginError = createStore<string | null>(null);
export const $email = createStore("");
export const $password = createStore("");

// Events
export const emailChanged = createEvent<string>();
export const passwordChanged = createEvent<string>();
export const loginSubmitted = createEvent();
export const loggedOut = createEvent();

// Effects
export const loginFx = createEffect(
  async ({ email, password }: { email: string; password: string }) => {
    const result = await adminApiMethods.login(email, password);
    localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    return result.token;
  }
);

export const logoutFx = createEffect(async () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
});

// Samples
sample({ clock: emailChanged, target: $email });

sample({ clock: passwordChanged, target: $password });

sample({
  clock: loginSubmitted,
  source: { email: $email, password: $password },
  target: loginFx,
});

sample({
  clock: loginFx.doneData,
  target: $adminToken,
});

sample({
  clock: loginFx.failData,
  fn: (error) => {
    const axiosError = error as { response?: { data?: { error?: string } } };
    return axiosError.response?.data?.error ?? "Ошибка авторизации";
  },
  target: $loginError,
});

sample({
  clock: loginSubmitted,
  fn: () => null,
  target: $loginError,
});

sample({ clock: loggedOut, target: logoutFx });

sample({
  clock: logoutFx.done,
  fn: () => null,
  target: $adminToken,
});

sample({
  clock: adminTokenInvalidated,
  fn: () => null,
  target: $adminToken,
});

sample({
  clock: loginFx.done,
  fn: () => "",
  target: $password,
});

// Restore token from localStorage on module load
const adminTokenRestored = createEvent<string | null>();
sample({ clock: adminTokenRestored, target: $adminToken });
adminTokenRestored(localStorage.getItem(ADMIN_TOKEN_KEY));
