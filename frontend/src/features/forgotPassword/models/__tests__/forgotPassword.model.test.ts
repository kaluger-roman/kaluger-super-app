import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { authApi } from "@shared";

import * as forgotPasswordModel from "../forgotPassword.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      forgotPassword: vi.fn(),
    },
  };
});

describe("features/forgotPassword/models/forgotPassword.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("emailChanged", () => {
    it("should update $email", async () => {
      const scope = fork();
      await allSettled(forgotPasswordModel.emailChanged, {
        scope,
        params: "user@example.com",
      });
      expect(scope.getState(forgotPasswordModel.$email)).toBe("user@example.com");
    });

    it("should clear error when email changes", async () => {
      const scope = fork({
        values: [[forgotPasswordModel.$error, "Some error"]],
      });
      await allSettled(forgotPasswordModel.emailChanged, {
        scope,
        params: "user@example.com",
      });
      expect(scope.getState(forgotPasswordModel.$error)).toBeNull();
    });
  });

  describe("formSubmitted", () => {
    it("should call authApi.forgotPassword with email when not empty", async () => {
      vi.mocked(authApi.forgotPassword).mockResolvedValueOnce({ message: "ok" });

      const scope = fork({
        values: [[forgotPasswordModel.$email, "user@example.com"]],
      });

      await allSettled(forgotPasswordModel.formSubmitted, { scope });

      expect(authApi.forgotPassword).toHaveBeenCalledWith({ email: "user@example.com" });
    });

    it("should not call api when email is empty", async () => {
      const scope = fork({ values: [[forgotPasswordModel.$email, ""]] });

      await allSettled(forgotPasswordModel.formSubmitted, { scope });

      expect(authApi.forgotPassword).not.toHaveBeenCalled();
    });

    it("should set $isSent to true on success", async () => {
      vi.mocked(authApi.forgotPassword).mockResolvedValueOnce({
        message: "Если адрес зарегистрирован",
      });
      const scope = fork({
        values: [[forgotPasswordModel.$email, "user@example.com"]],
      });

      await allSettled(forgotPasswordModel.formSubmitted, { scope });

      expect(scope.getState(forgotPasswordModel.$isSent)).toBe(true);
      expect(scope.getState(forgotPasswordModel.$successMessage)).toBe(
        "Если адрес зарегистрирован",
      );
    });

    it("should set $error on failure", async () => {
      vi.mocked(authApi.forgotPassword).mockRejectedValueOnce({
        response: { data: { error: "Слишком много попыток" } },
        message: "fail",
      });
      const scope = fork({
        values: [[forgotPasswordModel.$email, "user@example.com"]],
      });

      await allSettled(forgotPasswordModel.formSubmitted, { scope });

      expect(scope.getState(forgotPasswordModel.$error)).toBe("Слишком много попыток");
      expect(scope.getState(forgotPasswordModel.$isSent)).toBe(false);
    });
  });

  describe("formReset", () => {
    it("should reset all stores to defaults", async () => {
      const scope = fork({
        values: [
          [forgotPasswordModel.$email, "user@example.com"],
          [forgotPasswordModel.$isSent, true],
          [forgotPasswordModel.$successMessage, "msg"],
          [forgotPasswordModel.$error, "err"],
        ],
      });

      await allSettled(forgotPasswordModel.formReset, { scope });

      expect(scope.getState(forgotPasswordModel.$email)).toBe("");
      expect(scope.getState(forgotPasswordModel.$isSent)).toBe(false);
      expect(scope.getState(forgotPasswordModel.$successMessage)).toBeNull();
      expect(scope.getState(forgotPasswordModel.$error)).toBeNull();
    });
  });
});
