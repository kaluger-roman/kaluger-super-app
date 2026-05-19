import { allSettled, fork } from "effector";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { studentAuthApi, studentInvitationsApi } from "@shared";

import * as model from "../student-invite.model";

vi.mock("@shared", async () => {
  const actual =
    await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    studentInvitationsApi: {
      ...actual.studentInvitationsApi,
      validateToken: vi.fn(),
    },
    studentAuthApi: {
      ...actual.studentAuthApi,
      registerByInvite: vi.fn(),
    },
    setStudentToken: vi.fn(),
    navigate: vi.fn(),
  };
});

describe("features/studentAuth/models/student-invite.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates invitation token when tokenSet is fired", async () => {
    vi.mocked(studentInvitationsApi.validateToken).mockResolvedValueOnce({
      valid: true,
      studentName: "Иван",
      tutorName: "Анна",
    });

    const scope = fork();
    await allSettled(model.tokenSet, { scope, params: "raw-token" });

    expect(studentInvitationsApi.validateToken).toHaveBeenCalledWith(
      "raw-token"
    );
    expect(scope.getState(model.$validationState)).toEqual({
      valid: true,
      studentName: "Иван",
      tutorName: "Анна",
    });
  });

  it("does not call validate API for empty token", async () => {
    const scope = fork();
    await allSettled(model.tokenSet, { scope, params: "" });
    expect(studentInvitationsApi.validateToken).not.toHaveBeenCalled();
  });

  it("rejects submission when name is empty (local validation)", async () => {
    const scope = fork({
      values: [
        [model.$token, "raw"],
        [model.$name, ""],
        [model.$email, "good@example.com"],
        [model.$password, "GoodPass1"],
        [model.$passwordConfirmation, "GoodPass1"],
      ],
    });

    await allSettled(model.formSubmitted, { scope, params: undefined });

    expect(studentAuthApi.registerByInvite).not.toHaveBeenCalled();
    expect(scope.getState(model.$formError)).toBe("Введите ФИО");
  });

  it("rejects submission when passwords do not match", async () => {
    const scope = fork({
      values: [
        [model.$token, "raw"],
        [model.$name, "Иван"],
        [model.$email, "good@example.com"],
        [model.$password, "GoodPass1"],
        [model.$passwordConfirmation, "OtherPass1"],
      ],
    });

    await allSettled(model.formSubmitted, { scope, params: undefined });

    expect(studentAuthApi.registerByInvite).not.toHaveBeenCalled();
    expect(scope.getState(model.$formError)).toBe("Пароли не совпадают");
  });

  it("rejects submission when password fails policy", async () => {
    const scope = fork({
      values: [
        [model.$token, "raw"],
        [model.$name, "Иван"],
        [model.$email, "good@example.com"],
        [model.$password, "weak"],
        [model.$passwordConfirmation, "weak"],
      ],
    });

    await allSettled(model.formSubmitted, { scope, params: undefined });

    expect(studentAuthApi.registerByInvite).not.toHaveBeenCalled();
    expect(scope.getState(model.$formError)).toMatch(/Пароль должен/);
  });

  it("submits when all fields are valid and clears error on success", async () => {
    vi.mocked(studentAuthApi.registerByInvite).mockResolvedValueOnce({
      token: "jwt",
      student: {
        id: "su-1",
        email: "good@example.com",
        name: "Иван",
        isEmailVerified: false,
        tutor: { name: "Анна" },
      },
    });

    const scope = fork({
      values: [
        [model.$token, "raw"],
        [model.$name, "Иван"],
        [model.$email, "good@example.com"],
        [model.$password, "GoodPass1"],
        [model.$passwordConfirmation, "GoodPass1"],
      ],
    });

    await allSettled(model.formSubmitted, { scope, params: undefined });

    expect(studentAuthApi.registerByInvite).toHaveBeenCalledWith({
      token: "raw",
      name: "Иван",
      email: "good@example.com",
      password: "GoodPass1",
      passwordConfirmation: "GoodPass1",
    });
  });

  it("clears form fields and validation on formReset", async () => {
    const scope = fork({
      values: [
        [model.$name, "Старое"],
        [model.$email, "old@example.com"],
        [model.$password, "Old1234A"],
        [model.$passwordConfirmation, "Old1234A"],
        [
          model.$validationState,
          { valid: true, studentName: "X", tutorName: "Y" },
        ],
      ],
    });

    await allSettled(model.formReset, { scope, params: undefined });

    expect(scope.getState(model.$name)).toBe("");
    expect(scope.getState(model.$email)).toBe("");
    expect(scope.getState(model.$password)).toBe("");
    expect(scope.getState(model.$passwordConfirmation)).toBe("");
    expect(scope.getState(model.$validationState)).toBeNull();
  });
});
