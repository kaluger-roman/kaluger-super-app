import { createStore, createEvent, createEffect } from "effector";
import { User, authApi } from "../../../shared";

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
  async ({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name: string;
  }) => {
    const response = await authApi.register({ email, password, name });
    localStorage.setItem("authToken", response.token);
    return response;
  }
);

export const getProfileFx = createEffect(async () => {
  return await authApi.getProfile();
});

// Stores
export const $user = createStore<User | null>(null)
  .on(loginFx.doneData, (_, { user }) => user)
  .on(registerFx.doneData, (_, { user }) => user)
  .on(getProfileFx.doneData, (_, user) => user)
  .reset(logoutUser);

export const $isAuthenticated = $user.map((user) => user !== null);

export const $authToken = createStore<string | null>(
  localStorage.getItem("authToken")
)
  .on(loginFx.doneData, (_, { token }) => token)
  .on(registerFx.doneData, (_, { token }) => token)
  .on(setAuthToken, (_, token) => token)
  .reset(logoutUser);

export const $isLoading = createStore(false)
  .on([loginFx, registerFx, getProfileFx], () => true)
  .on(
    [
      loginFx.done,
      registerFx.done,
      getProfileFx.done,
      loginFx.fail,
      registerFx.fail,
      getProfileFx.fail,
    ],
    () => false
  );

export const $authError = createStore<string | null>(null)
  .on([loginFx.fail, registerFx.fail], (_, { error }) => {
    const axiosError = error as any;
    return (
      axiosError?.response?.data?.error ||
      axiosError?.message ||
      "Произошла ошибка"
    );
  })
  .on([loginFx, registerFx, clearAuthError], () => null);

// Connect events to effects
loginUser.watch(loginFx);
registerUser.watch(registerFx);

// Clear token on logout
logoutUser.watch(() => {
  localStorage.removeItem("authToken");
});
