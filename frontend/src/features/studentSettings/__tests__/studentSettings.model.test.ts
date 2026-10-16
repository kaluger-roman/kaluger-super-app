import { fork } from "effector";
import { describe, expect, it } from "vitest";

import { studentUserModel } from "@entities";

import { studentSettingsModel } from "..";

describe("features/studentSettings model", () => {
  it("$studentInfo and $tutorInfo return null when no session", () => {
    const scope = fork({
      values: [[studentUserModel.$studentSession, null]],
    });

    expect(scope.getState(studentSettingsModel.$studentInfo)).toBeNull();
    expect(scope.getState(studentSettingsModel.$tutorInfo)).toBeNull();
  });

  it("$studentInfo derives name + email + isEmailVerified from session", () => {
    const scope = fork({
      values: [
        [
          studentUserModel.$studentSession,
          {
            id: "su-1",
            name: "Иван",
            email: "i@example.com",
            isEmailVerified: true,
            tutor: { name: "Анна" },
          },
        ],
      ],
    });

    expect(scope.getState(studentSettingsModel.$studentInfo)).toEqual({
      name: "Иван",
      email: "i@example.com",
      isEmailVerified: true,
    });
  });

  it("$tutorInfo returns tutor object when linked", () => {
    const scope = fork({
      values: [
        [
          studentUserModel.$studentSession,
          {
            id: "su-1",
            name: "Иван",
            email: "i@example.com",
            isEmailVerified: false,
            tutor: { name: "Анна" },
          },
        ],
      ],
    });

    expect(scope.getState(studentSettingsModel.$tutorInfo)).toEqual({
      name: "Анна",
    });
  });

  it("$tutorInfo returns null when tutor link is broken", () => {
    const scope = fork({
      values: [
        [
          studentUserModel.$studentSession,
          {
            id: "su-1",
            name: "Иван",
            email: "i@example.com",
            isEmailVerified: false,
            tutor: null,
          },
        ],
      ],
    });

    expect(scope.getState(studentSettingsModel.$tutorInfo)).toBeNull();
  });
});
