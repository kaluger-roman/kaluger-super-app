import { createEffect, createEvent, sample, createStore } from "effector";
import { createGate } from "effector-react";

import { userModel, verificationModel } from "@entities";
import { navigate, notificationsModel, authApi } from "@shared";

export const RegisterFormGate = createGate();

export const submitRegister = createEvent<{
  email: string;
  password: string;
  name: string;
}>();

export const registerFx = createEffect(
  async ({ email, password, name }: { email: string; password: string; name: string }) => {
    const response = await authApi.register({ email, password, name });
    return response;
  }
);

export const $isLoading = registerFx.pending;
export const $registerError = createStore<string | null>(null);

const navigateToVerificationFx = createEffect(() => {
  navigate("/verify-email", { replace: true });
});

const navigateToHomeFx = createEffect(() => {
  navigate("/", { replace: true });
});

sample({
  clock: [RegisterFormGate.open, RegisterFormGate.close],
  fn: () => null,
  target: $registerError,
});

sample({
  clock: submitRegister,
  target: registerFx,
});

// Clear error on start
sample({
  clock: registerFx,
  fn: () => null,
  target: $registerError,
});

// Handle errors
sample({
  clock: registerFx.failData,
  fn: (error) => {
    const axiosError = error as unknown as {
      response?: { data?: { error?: string } };
      message: string;
    };
    return axiosError?.response?.data?.error || axiosError?.message || "Произошла ошибка";
  },
  target: $registerError,
});

// Handle successful registration
sample({
  clock: registerFx.doneData,
  fn: ({ user }) => user.email,
  target: verificationModel.setVerificationEmail,
});

sample({
  clock: registerFx.doneData,
  fn: () => "Регистрация успешна! Проверьте email для подтверждения",
  target: notificationsModel.showSuccessEvent,
});

sample({
  clock: registerFx.doneData,
  filter: ({ user }) => !!user && user.isEmailVerified === false,
  target: navigateToVerificationFx,
});

sample({
  clock: verificationModel.$verificationEmail,
  source: { email: verificationModel.$verificationEmail, isAuth: userModel.$isAuthenticated },
  filter: ({ email, isAuth }) => email !== null && !isAuth,
  target: navigateToVerificationFx,
});

// Navigate to home only when registration response itself reports a
// pre-verified user. Listening on userModel.$isAuthenticated would also
// fire on email verification or login from a different flow.
sample({
  clock: registerFx.doneData,
  filter: (payload) => payload?.user?.isEmailVerified === true,
  target: navigateToHomeFx,
});
