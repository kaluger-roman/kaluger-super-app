import { createEffect, createEvent, createStore, sample } from "effector";
import { createGate } from "effector-react";

import type { StudentSession } from "@shared";
import {
  clearStudentToken,
  getStudentToken,
  navigate,
  setStudentToken,
  studentAuthApi,
} from "@shared";

// Gate driving the student-cabinet layout — opens once when the cabinet is
// mounted and fetches the current session (replaces a useEffect that would
// otherwise initiate data fetching). Per docs/conventions/frontend.md.
export const StudentCabinetGate = createGate();

// Events
export const studentLoggedOut = createEvent();
export const studentAuthTokenReceived = createEvent<string>();
export const studentSessionUpdated = createEvent<StudentSession>();

// Effects
export const getCurrentStudentFx = createEffect(async () => {
  return await studentAuthApi.getProfile();
});

export const studentLogoutFx = createEffect(async () => {
  try {
    await studentAuthApi.logout();
  } catch (_) {
    // Серверный logout — best effort, на клиенте всё равно чистим токен.
  }
});

// Stores
export const $studentSession = createStore<StudentSession | null>(null);

export const $isStudentAuthenticated = $studentSession.map(
  (session) => session !== null
);

export const $isStudentEmailVerified = $studentSession.map((session) =>
  session ? session.isEmailVerified : false
);

export const $isLoadingStudent = getCurrentStudentFx.pending;

// Reactions
sample({
  clock: getCurrentStudentFx.doneData,
  target: $studentSession,
});

// Hydrate session from server when the cabinet mounts AND we have a token
// but no session yet. Avoids redundant fetches when already authenticated.
sample({
  clock: StudentCabinetGate.open,
  source: $studentSession,
  filter: (session) => session === null && getStudentToken() !== null,
  target: getCurrentStudentFx,
});

sample({
  clock: studentSessionUpdated,
  target: $studentSession,
});

sample({
  clock: studentAuthTokenReceived,
  target: createEffect((token: string) => {
    setStudentToken(token);
  }),
});

sample({
  clock: studentLoggedOut,
  target: studentLogoutFx,
});

sample({
  clock: studentLoggedOut,
  fn: () => null,
  target: $studentSession,
});

sample({
  clock: studentLoggedOut,
  target: createEffect(() => {
    clearStudentToken();
    navigate("/login", { replace: true });
  }),
});
