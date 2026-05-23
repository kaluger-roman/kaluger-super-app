import { combine } from "effector";

import { studentUserModel } from "@entities";

export const $studentInfo = combine(
  studentUserModel.$studentSession,
  (session) =>
    session
      ? {
          name: session.name,
          email: session.email,
          isEmailVerified: session.isEmailVerified,
        }
      : null
);

export const $tutorInfo = combine(
  studentUserModel.$studentSession,
  (session) => session?.tutor ?? null
);
