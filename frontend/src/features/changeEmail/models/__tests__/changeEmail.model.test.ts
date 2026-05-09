import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { authApi } from "@shared";

import * as changeEmailModel from "../changeEmail.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
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
      await allSettled(changeEmailModel.newEmailChanged, { scope, params: "new@example.com" });
      expect(scope.getState(changeEmailModel.$newEmail)).toBe("new@example.com");
    });

    it("should update password", async () => {
      const scope = fork();
      await allSettled(changeEmailModel.passwordChanged, { scope, params: "Password1" });
      expect(scope.getState(changeEmailModel.$password)).toBe("Password1");
    });

    it("should update code", async () => {
      const scope = fork();
      await allSettled(changeEmailModel.codeChanged, { scope, params: "123456" });
      expect(scope.getState(changeEmailModel.$code)).toBe("123456");
    });

    it("should reset all fields on formReset", async () => {
      const scope = fork({
        values: [
          [changeEmailModel.$newEmail, "test@example.com"],
          [changeEmailModel.$password, "pass"],
          [changeEmailModel.$code, "123456"],
          [changeEmailModel.$error, "error"],
          [changeEmailModel.$isCodeStep, true],
        ],
      });

      await allSettled(changeEmailModel.formReset, { scope });

      expect(scope.getState(changeEmailModel.$newEmail)).toBe("");
      expect(scope.getState(changeEmailModel.$password)).toBe("");
      expect(scope.getState(changeEmailModel.$code)).toBe("");
      expect(scope.getState(changeEmailModel.$error)).toBeNull();
      expect(scope.getState(changeEmailModel.$isCodeStep)).toBe(false);
    });

    it("should reset timer state on formReset", async () => {
      const scope = fork({
        values: [
          [changeEmailModel.$resendTimer, 30],
          [changeEmailModel.$canResend, false],
        ],
      });

      await allSettled(changeEmailModel.formReset, { scope });

      expect(scope.getState(changeEmailModel.$resendTimer)).toBe(0);
      expect(scope.getState(changeEmailModel.$canResend)).toBe(true);
    });
  });

  describe("initiate email change", () => {
    it("should call changeEmailFx and move to code step on success", async () => {
      vi.useFakeTimers();
      vi.mocked(authApi.changeEmail).mockResolvedValueOnce({
        message: "Код верификации отправлен на новый email",
      });

      const scope = fork();

      const promise = allSettled(changeEmailModel.changeEmailFx, {
        scope,
        params: { newEmail: "new@example.com", password: "Password1" },
      });

      await vi.advanceTimersByTimeAsync(61000);
      await promise;

      expect(authApi.changeEmail).toHaveBeenCalledWith({
        newEmail: "new@example.com",
        password: "Password1",
      });
      expect(scope.getState(changeEmailModel.$isCodeStep)).toBe(true);

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
          [changeEmailModel.$newEmail, "taken@example.com"],
          [changeEmailModel.$password, "Password1"],
        ],
      });

      await allSettled(changeEmailModel.initiateSubmitted, { scope });

      expect(scope.getState(changeEmailModel.$error)).toBe("Этот email уже используется");
      expect(scope.getState(changeEmailModel.$isCodeStep)).toBe(false);
    });
  });

  describe("verify email change", () => {
    it("should call verifyEmailChangeFx on verifySubmitted", async () => {
      vi.mocked(authApi.verifyEmailChange).mockResolvedValueOnce({
        message: "Email успешно изменён",
        token: "new-token",
        user: { id: "1", email: "new@example.com", name: "Test", createdAt: "", isEmailVerified: true, taxEnabled: false },
      });

      const scope = fork({
        values: [[changeEmailModel.$code, "123456"]],
      });

      await allSettled(changeEmailModel.verifySubmitted, { scope });

      expect(authApi.verifyEmailChange).toHaveBeenCalledWith({ code: "123456" });
    });

    it("should save token to localStorage on success", async () => {
      vi.mocked(authApi.verifyEmailChange).mockResolvedValueOnce({
        message: "Email успешно изменён",
        token: "new-jwt-token",
        user: { id: "1", email: "new@example.com", name: "Test", createdAt: "", isEmailVerified: true, taxEnabled: false },
      });

      const scope = fork({
        values: [[changeEmailModel.$code, "123456"]],
      });

      await allSettled(changeEmailModel.verifySubmitted, { scope });

      expect(localStorage.getItem("authToken")).toBe("new-jwt-token");
    });

    it("should set error on failure", async () => {
      const axiosError = {
        response: { data: { error: "Неверный код верификации" } },
        message: "Request failed",
      };
      vi.mocked(authApi.verifyEmailChange).mockRejectedValueOnce(axiosError);

      const scope = fork({
        values: [[changeEmailModel.$code, "000000"]],
      });

      await allSettled(changeEmailModel.verifySubmitted, { scope });

      expect(scope.getState(changeEmailModel.$error)).toBe("Неверный код верификации");
    });
  });

  describe("dialog open/close", () => {
    it("should open dialog on dialogOpened", async () => {
      const scope = fork();

      await allSettled(changeEmailModel.dialogOpened, { scope });

      expect(scope.getState(changeEmailModel.$isDialogOpen)).toBe(true);
    });

    it("should close dialog and reset form on dialogClosed", async () => {
      const scope = fork({
        values: [
          [changeEmailModel.$isDialogOpen, true],
          [changeEmailModel.$newEmail, "test@example.com"],
          [changeEmailModel.$password, "pass"],
          [changeEmailModel.$isCodeStep, true],
        ],
      });

      await allSettled(changeEmailModel.dialogClosed, { scope });

      expect(scope.getState(changeEmailModel.$isDialogOpen)).toBe(false);
      expect(scope.getState(changeEmailModel.$newEmail)).toBe("");
      expect(scope.getState(changeEmailModel.$isCodeStep)).toBe(false);
    });

    it("should close dialog after successful verify", async () => {
      vi.mocked(authApi.verifyEmailChange).mockResolvedValueOnce({
        message: "Email успешно изменён",
        token: "new-token",
        user: { id: "1", email: "new@example.com", name: "Test", createdAt: "", isEmailVerified: true, taxEnabled: false },
      });

      const scope = fork({
        values: [
          [changeEmailModel.$isDialogOpen, true],
          [changeEmailModel.$code, "123456"],
        ],
      });

      await allSettled(changeEmailModel.verifySubmitted, { scope });

      expect(scope.getState(changeEmailModel.$isDialogOpen)).toBe(false);
    });
  });

  describe("error clearing", () => {
    it("should clear error on field change", async () => {
      const scope = fork({ values: [[changeEmailModel.$error, "some error"]] });

      await allSettled(changeEmailModel.newEmailChanged, { scope, params: "x" });
      expect(scope.getState(changeEmailModel.$error)).toBeNull();
    });
  });
});
