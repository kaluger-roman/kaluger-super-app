import {
  createEffect,
  createEvent,
  createStore,
  sample,
} from "effector";
import { createGate } from "effector-react";

import { studentUserModel } from "@entities";
import type {
  StudentAuthResponse,
  StudentRegisterByInviteRequest,
  ValidateInvitationResponse,
} from "@shared";
import { navigate, setStudentToken, studentAuthApi, studentInvitationsApi } from "@shared";

import {
  extractAxiosError,
  isValidEmail,
  isValidName,
  isValidPassword,
} from "./student-auth.helpers";

// Gate carries the raw token from the URL — its lifecycle drives validation
// and resets the form when the page unmounts.
export const StudentInviteGate = createGate<{ token: string }>();

// Form fields
export const $token = createStore<string>("");
export const tokenSet = createEvent<string>();

export const $name = createStore<string>("");
export const nameChanged = createEvent<string>();

export const $email = createStore<string>("");
export const emailChanged = createEvent<string>();

export const $password = createStore<string>("");
export const passwordChanged = createEvent<string>();

export const $passwordConfirmation = createStore<string>("");
export const passwordConfirmationChanged = createEvent<string>();

export const $formError = createStore<string | null>(null);
export const $validationState = createStore<ValidateInvitationResponse | null>(
  null
);

export const formSubmitted = createEvent();
export const formReset = createEvent();

export const validateInvitationTokenFx = createEffect(
  async (token: string) => studentInvitationsApi.validateToken(token)
);

export const registerStudentByInviteFx = createEffect(
  async (dto: StudentRegisterByInviteRequest): Promise<StudentAuthResponse> =>
    studentAuthApi.registerByInvite(dto)
);

export const $isValidating = validateInvitationTokenFx.pending;
export const $isRegistering = registerStudentByInviteFx.pending;

sample({ clock: tokenSet, target: $token });

sample({
  clock: tokenSet,
  filter: (token) => token.length > 0,
  target: validateInvitationTokenFx,
});

// Triggered when the StudentInvitePage mounts — replaces the useEffect-driven
// data fetch (см. docs/conventions/frontend.md — "useEffect for initial data
// fetching" is forbidden; use Gate.open instead).
sample({
  clock: StudentInviteGate.open,
  fn: ({ token }) => token,
  target: tokenSet,
});

sample({ clock: StudentInviteGate.close, target: formReset });

sample({ clock: validateInvitationTokenFx.doneData, target: $validationState });

sample({ clock: nameChanged, target: $name });
sample({ clock: emailChanged, target: $email });
sample({ clock: passwordChanged, target: $password });
sample({
  clock: passwordConfirmationChanged,
  target: $passwordConfirmation,
});

sample({
  clock: [
    nameChanged,
    emailChanged,
    passwordChanged,
    passwordConfirmationChanged,
  ],
  fn: () => null,
  target: $formError,
});

const validateLocalForm = (state: {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}): string | null => {
  if (!isValidName(state.name)) {
    return "Введите ФИО";
  }
  if (!isValidEmail(state.email)) {
    return "Введите корректный email";
  }
  if (!isValidPassword(state.password)) {
    return "Пароль должен содержать минимум 8 символов, заглавную и строчную буквы, цифру";
  }
  if (state.password !== state.passwordConfirmation) {
    return "Пароли не совпадают";
  }
  return null;
};

sample({
  clock: formSubmitted,
  source: {
    token: $token,
    name: $name,
    email: $email,
    password: $password,
    passwordConfirmation: $passwordConfirmation,
  },
  filter: (state) => validateLocalForm(state) === null,
  target: registerStudentByInviteFx,
});

sample({
  clock: formSubmitted,
  source: {
    name: $name,
    email: $email,
    password: $password,
    passwordConfirmation: $passwordConfirmation,
  },
  filter: (state) => validateLocalForm(state) !== null,
  fn: (state) => validateLocalForm(state) ?? "",
  target: $formError,
});

sample({
  clock: registerStudentByInviteFx.doneData,
  target: createEffect((data: StudentAuthResponse) => {
    setStudentToken(data.token);
  }),
});

sample({
  clock: registerStudentByInviteFx.doneData,
  fn: (data) => data.student,
  target: studentUserModel.studentSessionUpdated,
});

sample({
  clock: registerStudentByInviteFx.done,
  target: createEffect(() => {
    navigate("/student/cabinet", { replace: true });
  }),
});

sample({
  clock: registerStudentByInviteFx.failData,
  fn: extractAxiosError,
  target: $formError,
});

sample({
  clock: formReset,
  fn: () => "",
  target: [$name, $email, $password, $passwordConfirmation],
});

sample({
  clock: formReset,
  fn: () => null,
  target: [$formError, $validationState],
});
