import {
  createEffect,
  createEvent,
  createStore,
  sample,
} from "effector";

import { studentUserModel } from "@entities";
import type { StudentAuthResponse, StudentLoginRequest } from "@shared";
import { navigate, setStudentToken, studentAuthApi } from "@shared";

import { extractAxiosError } from "./student-auth.helpers";
import { loginRoleToggled } from "../../auth/models/login-form.model";

export const studentLoginRequested = createEvent<StudentLoginRequest>();

export const $studentLoginError = createStore<string | null>(null);

export const studentLoginFx = createEffect(
  async (dto: StudentLoginRequest): Promise<StudentAuthResponse> =>
    studentAuthApi.login(dto)
);

export const $isLoggingIn = studentLoginFx.pending;

sample({ clock: studentLoginRequested, target: studentLoginFx });

sample({
  clock: studentLoginRequested,
  fn: () => null,
  target: $studentLoginError,
});

sample({
  clock: studentLoginFx.doneData,
  target: createEffect((data: StudentAuthResponse) => {
    setStudentToken(data.token);
  }),
});

sample({
  clock: studentLoginFx.doneData,
  fn: (data) => data.student,
  target: studentUserModel.studentSessionUpdated,
});

sample({
  clock: studentLoginFx.done,
  target: createEffect(() => {
    navigate("/student/cabinet", { replace: true });
  }),
});

sample({
  clock: studentLoginFx.failData,
  fn: extractAxiosError,
  target: $studentLoginError,
});

// Clear stale student error when user switches the login role toggle —
// otherwise the error from a previous student attempt persists after toggling
// to tutor and back to student.
sample({
  clock: loginRoleToggled,
  fn: () => null,
  target: $studentLoginError,
});
