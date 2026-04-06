import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { authApi } from "@shared";

import {
  changeEmailFx,
  newEmailChanged,
  passwordChanged,
  codeChanged,
  initiateSubmitted,
  verifySubmitted,
  formReset,
  cancelRequested,
  $newEmail,
  $password,
  $code,
  $error,
  $isCodeStep,
} from "../changeEmail.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      changeEmail: vi.fn(),
      verifyEmailChange: vi.fn(),
      resendEmailChangeCode: vi.fn(),
    },
  };
});

describe("features/changeEmail/models/changeEmail.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("form fields", () => {
    it("should update newEmail", async () => {
      const scope = fork();
      await allSettled(newEmailChanged, { scope, params: "new@example.com" });
      expect(scope.getState($newEmail)).toBe("new@example.com");
    });

    it("should update password", async () => {
      const scope = fork();
      await allSettled(passwordChanged, { scope, params: "Password1" });
      expect(scope.getState($password)).toBe("Password1");
    });

    it("should update code", async () => {
      const scope = fork();
      await allSettled(codeChanged, { scope, params: "123456" });
      expect(scope.getState($code)).toBe("123456");
    });

    it("should reset all fields on formReset", async () => {
      const scope = fork({
        values: [
          [$newEmail, "test@example.com"],
          [$password, "pass"],
          [$code, "123456"],
          [$error, "error"],
          [$isCodeStep, true],
        ],
      });

      await allSettled(formReset, { scope });

      expect(scope.getState($newEmail)).toBe("");
      expect(scope.getState($password)).toBe("");
      expect(scope.getState($code)).toBe("");
      expect(scope.getState($error)).toBeNull();
      expect(scope.getState($isCodeStep)).toBe(false);
    });
  });

  describe("initiate email change", () => {
    it("should call changeEmailFx and move to code step on success", async () => {
      vi.useFakeTimers();
      vi.mocked(authApi.changeEmail).mockResolvedValueOnce({
        message: "Код верификации отправлен на новый email",
      });

      const scope = fork();

      const promise = allSettled(changeEmailFx, {
        scope,
        params: { newEmail: "new@example.com", password: "Password1" },
      });

      // Advance timers to let interval complete (60s + buffer)
      await vi.advanceTimersByTimeAsync(61000);
      await promise;

      expect(authApi.changeEmail).toHaveBeenCalledWith({
        newEmail: "new@example.com",
        password: "Password1",
      });
      expect(scope.getState($isCodeStep)).toBe(true);

      vi.useRealTimers();
    });

    it("should set error on failure", async () => {
      const axiosError = {
        response: { data: { error: "Этот email уже используется" } },
        message: "Request failed",
      };
      vi.mocked(authApi.changeEmail).mockRejectedValueOnce(axiosError);

      const scope = fork({
        values: [
          [$newEmail, "taken@example.com"],
          [$password, "Password1"],
        ],
      });

      await allSettled(initiateSubmitted, { scope });

      expect(scope.getState($error)).toBe("Этот email уже используется");
      expect(scope.getState($isCodeStep)).toBe(false);
    });
  });

  describe("verify email change", () => {
    it("should call verifyEmailChangeFx on verifySubmitted", async () => {
      vi.mocked(authApi.verifyEmailChange).mockResolvedValueOnce({
        message: "Email успешно изменён",
        token: "new-token",
        user: { id: "1", email: "new@example.com", name: "Test", createdAt: "", isEmailVerified: true, taxRate: 6 },
      });

      const scope = fork({
        values: [[$code, "123456"]],
      });

      await allSettled(verifySubmitted, { scope });

      expect(authApi.verifyEmailChange).toHaveBeenCalledWith({ code: "123456" });
    });

    it("should save token to localStorage on success", async () => {
      vi.mocked(authApi.verifyEmailChange).mockResolvedValueOnce({
        message: "Email успешно изменён",
        token: "new-jwt-token",
        user: { id: "1", email: "new@example.com", name: "Test", createdAt: "", isEmailVerified: true, taxRate: 6 },
      });

      const scope = fork({
        values: [[$code, "123456"]],
      });

      await allSettled(verifySubmitted, { scope });

      expect(localStorage.getItem("authToken")).toBe("new-jwt-token");
    });

    it("should set error on failure", async () => {
      const axiosError = {
        response: { data: { error: "Неверный код верификации" } },
        message: "Request failed",
      };
      vi.mocked(authApi.verifyEmailChange).mockRejectedValueOnce(axiosError);

      const scope = fork({
        values: [[$code, "000000"]],
      });

      await allSettled(verifySubmitted, { scope });

      expect(scope.getState($error)).toBe("Неверный код верификации");
    });
  });

  describe("cancel", () => {
    it("should reset form on cancelRequested", async () => {
      const scope = fork({
        values: [
          [$newEmail, "test@example.com"],
          [$password, "pass"],
          [$isCodeStep, true],
        ],
      });

      await allSettled(cancelRequested, { scope });

      expect(scope.getState($newEmail)).toBe("");
      expect(scope.getState($isCodeStep)).toBe(false);
    });
  });

  describe("error clearing", () => {
    it("should clear error on field change", async () => {
      const scope = fork({ values: [[$error, "some error"]] });

      await allSettled(newEmailChanged, { scope, params: "x" });
      expect(scope.getState($error)).toBeNull();
    });
  });
});
