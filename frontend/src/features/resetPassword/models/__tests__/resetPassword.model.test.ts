import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { authApi } from "@shared";

import * as resetPasswordModel from "../resetPassword.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      verifyResetToken: vi.fn(),
      resetPassword: vi.fn(),
    },
  };
});

describe("features/resetPassword/models/resetPassword.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tokenSet", () => {
    it("should mark status as invalid_unknown for empty token without calling api", async () => {
      const scope = fork();
      await allSettled(resetPasswordModel.tokenSet, { scope, params: "" });

      expect(scope.getState(resetPasswordModel.$tokenStatus)).toBe("invalid_unknown");
      expect(authApi.verifyResetToken).not.toHaveBeenCalled();
    });

    it("should call verifyResetToken and set status to valid on success", async () => {
      vi.mocked(authApi.verifyResetToken).mockResolvedValueOnce({ valid: true });
      const scope = fork();

      await allSettled(resetPasswordModel.tokenSet, { scope, params: "valid-token" });

      expect(authApi.verifyResetToken).toHaveBeenCalledWith({ token: "valid-token" });
      expect(scope.getState(resetPasswordModel.$tokenStatus)).toBe("valid");
      expect(scope.getState(resetPasswordModel.$tokenError)).toBeNull();
    });

    it("should set status to invalid_expired for expired token error", async () => {
      vi.mocked(authApi.verifyResetToken).mockRejectedValueOnce({
        response: { data: { error: "Срок действия ссылки истёк. Запросите новую" } },
        message: "fail",
      });
      const scope = fork();

      await allSettled(resetPasswordModel.tokenSet, { scope, params: "expired-token" });

      expect(scope.getState(resetPasswordModel.$tokenStatus)).toBe("invalid_expired");
      expect(scope.getState(resetPasswordModel.$tokenError)).toMatch(/истёк/);
    });

    it("should set status to invalid_used for used token error", async () => {
      vi.mocked(authApi.verifyResetToken).mockRejectedValueOnce({
        response: { data: { error: "Эта ссылка уже была использована. Запросите новую" } },
        message: "fail",
      });
      const scope = fork();

      await allSettled(resetPasswordModel.tokenSet, { scope, params: "used-token" });

      expect(scope.getState(resetPasswordModel.$tokenStatus)).toBe("invalid_used");
    });

    it("should set status to invalid_unknown for generic error", async () => {
      vi.mocked(authApi.verifyResetToken).mockRejectedValueOnce({
        response: { data: { error: "Ссылка для сброса пароля недействительна" } },
        message: "fail",
      });
      const scope = fork();

      await allSettled(resetPasswordModel.tokenSet, { scope, params: "bad-token" });

      expect(scope.getState(resetPasswordModel.$tokenStatus)).toBe("invalid_unknown");
    });
  });

  describe("password fields", () => {
    it("should update newPassword and confirmPassword", async () => {
      const scope = fork();
      await allSettled(resetPasswordModel.newPasswordChanged, { scope, params: "NewPass1" });
      await allSettled(resetPasswordModel.confirmPasswordChanged, {
        scope,
        params: "NewPass1",
      });

      expect(scope.getState(resetPasswordModel.$newPassword)).toBe("NewPass1");
      expect(scope.getState(resetPasswordModel.$confirmPassword)).toBe("NewPass1");
    });

    it("should clear error on password field change", async () => {
      const scope = fork({ values: [[resetPasswordModel.$error, "Some error"]] });

      await allSettled(resetPasswordModel.newPasswordChanged, { scope, params: "x" });

      expect(scope.getState(resetPasswordModel.$error)).toBeNull();
    });
  });

  describe("formSubmitted", () => {
    it("should call resetPassword with token and passwords", async () => {
      vi.mocked(authApi.resetPassword).mockResolvedValueOnce({ message: "ok" });
      const scope = fork({
        values: [
          [resetPasswordModel.$token, "valid-token"],
          [resetPasswordModel.$newPassword, "NewPass1"],
          [resetPasswordModel.$confirmPassword, "NewPass1"],
        ],
      });

      await allSettled(resetPasswordModel.formSubmitted, { scope });

      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: "valid-token",
        newPassword: "NewPass1",
        confirmPassword: "NewPass1",
      });
    });

    it("should not call api when fields are empty", async () => {
      const scope = fork({
        values: [[resetPasswordModel.$token, "t"], [resetPasswordModel.$newPassword, ""]],
      });

      await allSettled(resetPasswordModel.formSubmitted, { scope });

      expect(authApi.resetPassword).not.toHaveBeenCalled();
    });

    it("should set $isSuccess to true on success", async () => {
      vi.mocked(authApi.resetPassword).mockResolvedValueOnce({ message: "ok" });
      const scope = fork({
        values: [
          [resetPasswordModel.$token, "valid-token"],
          [resetPasswordModel.$newPassword, "NewPass1"],
          [resetPasswordModel.$confirmPassword, "NewPass1"],
        ],
      });

      await allSettled(resetPasswordModel.formSubmitted, { scope });

      expect(scope.getState(resetPasswordModel.$isSuccess)).toBe(true);
    });

    it("should set $error on failure", async () => {
      vi.mocked(authApi.resetPassword).mockRejectedValueOnce({
        response: { data: { error: "Новый пароль должен отличаться от текущего" } },
        message: "fail",
      });
      const scope = fork({
        values: [
          [resetPasswordModel.$token, "valid-token"],
          [resetPasswordModel.$newPassword, "Same1"],
          [resetPasswordModel.$confirmPassword, "Same1"],
        ],
      });

      await allSettled(resetPasswordModel.formSubmitted, { scope });

      expect(scope.getState(resetPasswordModel.$error)).toBe(
        "Новый пароль должен отличаться от текущего",
      );
      expect(scope.getState(resetPasswordModel.$isSuccess)).toBe(false);
    });
  });

  describe("formReset", () => {
    it("should reset all stores to defaults", async () => {
      const scope = fork({
        values: [
          [resetPasswordModel.$token, "t"],
          [resetPasswordModel.$tokenStatus, "valid"],
          [resetPasswordModel.$tokenError, "err"],
          [resetPasswordModel.$newPassword, "p"],
          [resetPasswordModel.$confirmPassword, "p"],
          [resetPasswordModel.$error, "err"],
          [resetPasswordModel.$isSuccess, true],
        ],
      });

      await allSettled(resetPasswordModel.formReset, { scope });

      expect(scope.getState(resetPasswordModel.$token)).toBe("");
      expect(scope.getState(resetPasswordModel.$tokenStatus)).toBe("idle");
      expect(scope.getState(resetPasswordModel.$tokenError)).toBeNull();
      expect(scope.getState(resetPasswordModel.$newPassword)).toBe("");
      expect(scope.getState(resetPasswordModel.$confirmPassword)).toBe("");
      expect(scope.getState(resetPasswordModel.$error)).toBeNull();
      expect(scope.getState(resetPasswordModel.$isSuccess)).toBe(false);
    });
  });
});
