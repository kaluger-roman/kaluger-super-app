import { createStore, createEvent, createEffect, sample } from "effector";

import type { User } from "@shared";
import { authApi, navigate } from "@shared";

import { verificationModel } from "../verification";

// Events
export const logoutUser = createEvent();
export const setAuthToken = createEvent<string>();
export const updateUser = createEvent<User>();

// Effects
export const getProfileFx = createEffect(async () => {
  return await authApi.getProfile();
});

// Stores
export const $user = createStore<User | null>(null);

export const $isAuthenticated = $user.map((user) => user !== null);

export const $authToken = createStore<string | null>(localStorage.getItem("authToken"));

export const $isLoading = getProfileFx.pending;

// Update user on successful auth
sample({
  clock: verificationModel.verifyEmailFx.doneData,
  fn: ({ user }) => user,
  target: $user,
});

sample({
  clock: getProfileFx.doneData,
  target: $user,
});

sample({
  clock: getProfileFx.doneData,
  filter: (user) => !user.isEmailVerified,
  fn: (user) => user.email,
  target: verificationModel.setVerificationEmail,
});

sample({
  clock: updateUser,
  target: $user,
});

// Update token
sample({
  clock: verificationModel.verifyEmailFx.doneData,
  filter: ({ token }) => token !== undefined,
  fn: ({ token }) => token as string,
  target: $authToken,
});

sample({
  clock: setAuthToken,
  target: $authToken,
});

// Clear user and token on logout
sample({
  clock: logoutUser,
  fn: () => null,
  target: $user,
});

sample({
  clock: logoutUser,
  target: createEffect(() => navigate("/login", { replace: true })),
});

sample({
  clock: logoutUser,
  fn: () => {
    localStorage.removeItem("authToken");
    return null;
  },
  target: $authToken,
});
