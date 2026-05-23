import { createEffect, createEvent, createStore, sample } from "effector";
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

export const $formErrors = createStore<string[]>([]);
export const $validationState = createStore<ValidateInvitationResponse | null>(null);

export const formSubmitted = createEvent();
export const formReset = createEvent();

export const validateInvitationTokenFx = createEffect(async (token: string) =>
  studentInvitationsApi.validateToken(token)
);

export const registerStudentByInviteFx = createEffect(
  async (dto: StudentRegisterByInviteRequest): Promise<StudentAuthResponse> =>
    studentAuthApi.registerByInvite(dto)
);

const persistStudentTokenFx = createEffect((data: StudentAuthResponse) => {
  setStudentToken(data.token);
});

const navigateToStudentCabinetFx = createEffect(() => {
  navigate("/student/cabinet", { replace: true });
});

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
  clock: [nameChanged, emailChanged, passwordChanged, passwordConfirmationChanged],
  fn: () => [] as string[],
  target: $formErrors,
});

const collectLocalErrors = (state: {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}): string[] => {
  const errors: string[] = [];
  if (!isValidName(state.name)) errors.push("Введите ФИО");
  if (!isValidEmail(state.email)) errors.push("Введите корректный email");
  if (!isValidPassword(state.password)) {
    errors.push("Пароль должен содержать минимум 8 символов, заглавную и строчную буквы, цифру");
  }
  if (state.password !== state.passwordConfirmation) {
    errors.push("Пароли не совпадают");
  }
  return errors;
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
  filter: (state) => collectLocalErrors(state).length === 0,
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
  filter: (state) => collectLocalErrors(state).length > 0,
  fn: (state) => collectLocalErrors(state),
  target: $formErrors,
});

sample({
  clock: registerStudentByInviteFx.doneData,
  target: persistStudentTokenFx,
});

sample({
  clock: registerStudentByInviteFx.doneData,
  fn: (data) => data.student,
  target: studentUserModel.studentSessionUpdated,
});

sample({
  clock: registerStudentByInviteFx.done,
  target: navigateToStudentCabinetFx,
});

sample({
  clock: StudentInviteGate.open,
  source: studentUserModel.$studentSession,
  filter: Boolean,
  target: navigateToStudentCabinetFx,
});

sample({
  clock: studentUserModel.$studentSession,
  source: StudentInviteGate.status,
  filter: (gateOpen, session) => gateOpen && session !== null,
  target: navigateToStudentCabinetFx,
});

sample({
  clock: registerStudentByInviteFx.failData,
  fn: (err) => [extractAxiosError(err)],
  target: $formErrors,
});

sample({
  clock: formReset,
  fn: () => "",
  target: [$name, $email, $password, $passwordConfirmation],
});

sample({
  clock: formReset,
  fn: () => [] as string[],
  target: $formErrors,
});

sample({
  clock: formReset,
  fn: () => null,
  target: $validationState,
});
