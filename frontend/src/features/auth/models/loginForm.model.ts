import { createStore, createEvent, createEffect, sample } from "effector";
import { createGate } from "effector-react";

import { userModel, verificationModel } from "@entities";
import {
  authApi,
  clearStudentToken,
  extractAxiosError,
  navigate,
  notificationsModel,
} from "@shared";

export const LoginFormGate = createGate();

export type LoginRole = "tutor" | "student";

export const $email = createStore("");
export const $password = createStore("");
export const $loginError = createStore<string | null>(null);
export const $loginRole = createStore<LoginRole>("tutor");

export const emailChanged = createEvent<string>();
export const passwordChanged = createEvent<string>();
export const loginRoleToggled = createEvent<LoginRole>();
export const formReset = createEvent();
export const submitLogin = createEvent<{ email: string; password: string }>();

export const loginFx = createEffect(
  async ({ email, password }: { email: string; password: string }) => {
    const response = await authApi.login({ email, password });
    if (response.token) {
      localStorage.setItem("authToken", response.token);
    }
    return { response, email };
  }
);

export const $isLoading = loginFx.pending;

const navigateToVerificationFx = createEffect(() => {
  navigate("/verify-email", { replace: true });
});

const navigateToHomeFx = createEffect(() => {
  navigate("/", { replace: true });
});

sample({
  clock: emailChanged,
  target: $email,
});

sample({
  clock: passwordChanged,
  target: $password,
});

sample({
  clock: loginRoleToggled,
  target: $loginRole,
});

sample({
  clock: loginRoleToggled,
  fn: () => null,
  target: $loginError,
});

sample({
  clock: formReset,
  fn: () => "",
  target: [$email, $password],
});

sample({
  clock: LoginFormGate.open,
  fn: () => null,
  target: $loginError,
});

sample({
  clock: LoginFormGate.close,
  target: formReset,
});

sample({
  clock: submitLogin,
  target: loginFx,
});

// Clear error on start
sample({
  clock: loginFx,
  fn: () => null,
  target: $loginError,
});

const clearStudentTokenFx = createEffect(() => {
  clearStudentToken();
});

sample({
  clock: loginFx.doneData,
  target: clearStudentTokenFx,
});

sample({
  clock: loginFx.doneData,
  fn: ({ response }) => response.user,
  target: userModel.$user,
});

sample({
  clock: loginFx.doneData,
  filter: ({ response }) => response.token !== undefined,
  fn: ({ response }) => response.token as string,
  target: userModel.setAuthToken,
});

// Handle errors
sample({
  clock: loginFx.failData,
  fn: (err) => extractAxiosError(err, "Произошла ошибка"),
  target: $loginError,
});

const verificationLoginError = sample({
  clock: loginFx.failData,
  source: { email: $email },
  filter: ({ email }, err: Error & { error?: unknown }) => {
    const axiosError = err as { response?: { status?: number } } | undefined;
    return axiosError?.response?.status === 403 && Boolean(email);
  },
});

sample({
  clock: verificationLoginError,
  fn: ({ email }) => email,
  target: verificationModel.setVerificationEmail,
});

sample({
  clock: verificationLoginError,
  fn: () => "Подтвердите email для входа в систему",
  target: notificationsModel.showWarningEvent,
});

sample({
  clock: verificationLoginError,
  target: navigateToVerificationFx,
});

// Navigate to home only after a successful login of an already-verified user.
// Subscribing to userModel.$isAuthenticated would also fire on email verification
// or profile refresh, redirecting outside this flow.
sample({
  clock: loginFx.doneData,
  filter: (payload) => payload?.response?.user?.isEmailVerified === true,
  target: navigateToHomeFx,
});
