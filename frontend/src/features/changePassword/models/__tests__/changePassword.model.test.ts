import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { authApi } from "@shared";

import {
  changePasswordFx,
  currentPasswordChanged,
  newPasswordChanged,
  confirmPasswordChanged,
  formSubmitted,
  formReset,
  $currentPassword,
  $newPassword,
  $confirmPassword,
  $error,
} from "../changePassword.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      changePassword: vi.fn(),
    },
  };
});

describe("features/changePassword/models/changePassword.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("form fields", () => {
    it("should update currentPassword", async () => {
      const scope = fork();
      await allSettled(currentPasswordChanged, { scope, params: "OldPass1" });
      expect(scope.getState($currentPassword)).toBe("OldPass1");
    });

    it("should update newPassword", async () => {
      const scope = fork();
      await allSettled(newPasswordChanged, { scope, params: "NewPass1" });
      expect(scope.getState($newPassword)).toBe("NewPass1");
    });

    it("should update confirmPassword", async () => {
      const scope = fork();
      await allSettled(confirmPasswordChanged, { scope, params: "NewPass1" });
      expect(scope.getState($confirmPassword)).toBe("NewPass1");
    });

    it("should reset all fields on formReset", async () => {
      const scope = fork({
        values: [
          [$currentPassword, "old"],
          [$newPassword, "new"],
          [$confirmPassword, "confirm"],
          [$error, "some error"],
        ],
      });

      await allSettled(formReset, { scope });

      expect(scope.getState($currentPassword)).toBe("");
      expect(scope.getState($newPassword)).toBe("");
      expect(scope.getState($confirmPassword)).toBe("");
      expect(scope.getState($error)).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should clear error on field change", async () => {
      const scope = fork({ values: [[$error, "some error"]] });

      await allSettled(currentPasswordChanged, { scope, params: "x" });
      expect(scope.getState($error)).toBeNull();
    });

    it("should set error on changePasswordFx failure", async () => {
      const axiosError = {
        response: { data: { error: "Неверный текущий пароль" } },
        message: "Request failed",
      };
      vi.mocked(authApi.changePassword).mockRejectedValueOnce(axiosError);

      const scope = fork();
      await allSettled(changePasswordFx, {
        scope,
        params: {
          currentPassword: "wrong",
          newPassword: "NewPass1",
          confirmPassword: "NewPass1",
        },
      });

      expect(scope.getState($error)).toBe("Неверный текущий пароль");
    });
  });

  describe("form submission", () => {
    it("should call changePasswordFx on formSubmitted", async () => {
      vi.mocked(authApi.changePassword).mockResolvedValueOnce({
        message: "Пароль успешно изменён",
      });

      const scope = fork({
        values: [
          [$currentPassword, "OldPass1"],
          [$newPassword, "NewPass1"],
          [$confirmPassword, "NewPass1"],
        ],
      });

      await allSettled(formSubmitted, { scope });

      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: "OldPass1",
        newPassword: "NewPass1",
        confirmPassword: "NewPass1",
      });
    });

    it("should reset form after successful change", async () => {
      vi.mocked(authApi.changePassword).mockResolvedValueOnce({
        message: "Пароль успешно изменён",
      });

      const scope = fork({
        values: [
          [$currentPassword, "OldPass1"],
          [$newPassword, "NewPass1"],
          [$confirmPassword, "NewPass1"],
        ],
      });

      await allSettled(formSubmitted, { scope });

      expect(scope.getState($currentPassword)).toBe("");
      expect(scope.getState($newPassword)).toBe("");
      expect(scope.getState($confirmPassword)).toBe("");
    });
  });
});
