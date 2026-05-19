import { allSettled, fork } from "effector";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { studentAuthApi } from "@shared";

import * as model from "../student-login.model";

vi.mock("@shared", async () => {
  const actual =
    await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    studentAuthApi: {
      ...actual.studentAuthApi,
      login: vi.fn(),
    },
    setStudentToken: vi.fn(),
    navigate: vi.fn(),
  };
});

describe("features/studentAuth/models/student-login.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls studentAuthApi.login when studentLoginRequested fires", async () => {
    vi.mocked(studentAuthApi.login).mockResolvedValueOnce({
      token: "jwt",
      student: {
        id: "su-1",
        email: "s@example.com",
        name: "S",
        isEmailVerified: true,
        tutor: { name: "T" },
      },
    });

    const scope = fork();
    await allSettled(model.studentLoginRequested, {
      scope,
      params: { email: "s@example.com", password: "GoodPass1" },
    });

    expect(studentAuthApi.login).toHaveBeenCalledWith({
      email: "s@example.com",
      password: "GoodPass1",
    });
    expect(scope.getState(model.$studentLoginError)).toBeNull();
  });

  it("captures axios error message on failure", async () => {
    vi.mocked(studentAuthApi.login).mockRejectedValueOnce({
      response: { data: { error: "Неверный email или пароль" } },
    });

    const scope = fork();
    await allSettled(model.studentLoginRequested, {
      scope,
      params: { email: "x@example.com", password: "bad" },
    });

    expect(scope.getState(model.$studentLoginError)).toBe(
      "Неверный email или пароль"
    );
  });

  it("clears the previous error when a new login is requested", async () => {
    vi.mocked(studentAuthApi.login).mockResolvedValueOnce({
      token: "jwt",
      student: {
        id: "su-1",
        email: "s@example.com",
        name: "S",
        isEmailVerified: true,
        tutor: null,
      },
    });

    const scope = fork({
      values: [[model.$studentLoginError, "Старая ошибка"]],
    });
    await allSettled(model.studentLoginRequested, {
      scope,
      params: { email: "s@example.com", password: "GoodPass1" },
    });

    expect(scope.getState(model.$studentLoginError)).toBeNull();
  });
});
