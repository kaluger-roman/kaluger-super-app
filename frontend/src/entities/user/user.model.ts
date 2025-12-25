import { createStore, createEvent, createEffect, sample, combine } from "effector";

import type { User } from "@shared";
import { authApi } from "@shared";

// Events
export const loginUser = createEvent<{ email: string; password: string }>();
export const registerUser = createEvent<{
  email: string;
  password: string;
  name: string;
}>();
export const logoutUser = createEvent();
export const setAuthToken = createEvent<string>();
export const clearAuthError = createEvent();

// Effects
export const loginFx = createEffect(
  async ({ email, password }: { email: string; password: string }) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem("authToken", response.token);
    return response;
  }
);

export const registerFx = createEffect(
  async ({ email, password, name }: { email: string; password: string; name: string }) => {
    const response = await authApi.register({ email, password, name });
    localStorage.setItem("authToken", response.token);
    return response;
  }
);

export const getProfileFx = createEffect(async () => {
  return await authApi.getProfile();
});

// Stores
export const $user = createStore<User | null>(null);

export const $isAuthenticated = $user.map((user) => user !== null);

export const $authToken = createStore<string | null>(localStorage.getItem("authToken"));

export const $isLoading = combine(
  loginFx.pending,
  registerFx.pending,
  getProfileFx.pending,
  (loginLoading, registerLoading, profileLoading) =>
    loginLoading || registerLoading || profileLoading
);

export const $authError = createStore<string | null>(null);

// Connect events to effects
sample({
  clock: loginUser,
  target: loginFx,
});

sample({
  clock: registerUser,
  target: registerFx,
});

// Update user on successful auth
sample({
  clock: loginFx.doneData,
  fn: ({ user }) => user,
  target: $user,
});

sample({
  clock: registerFx.doneData,
  fn: ({ user }) => user,
  target: $user,
});

sample({
  clock: getProfileFx.doneData,
  target: $user,
});

// Update token
sample({
  clock: loginFx.doneData,
  fn: ({ token }) => token,
  target: $authToken,
});

sample({
  clock: registerFx.doneData,
  fn: ({ token }) => token,
  target: $authToken,
});

sample({
  clock: setAuthToken,
  target: $authToken,
});

// Handle errors
sample({
  clock: [loginFx.failData, registerFx.failData],
  fn: (error) => {
    const axiosError = error as unknown as {
      response?: { data?: { error?: string } };
      message: string;
    };
    return axiosError?.response?.data?.error || axiosError?.message || "Произошла ошибка";
  },
  target: $authError,
});

sample({
  clock: [loginFx, registerFx, clearAuthError],
  fn: () => null,
  target: $authError,
});

// Clear user and token on logout
sample({
  clock: logoutUser,
  fn: () => null,
  target: $user,
});

sample({
  clock: logoutUser,
  fn: () => {
    localStorage.removeItem("authToken");
    return null;
  },
  target: $authToken,
});
