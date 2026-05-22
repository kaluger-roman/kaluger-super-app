import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { authApi } from "@shared";

import * as changePasswordModel from "../changePassword.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual<typeof import("@shared")>("@shared");
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
      await allSettled(changePasswordModel.currentPasswordChanged, { scope, params: "OldPass1" });
      expect(scope.getState(changePasswordModel.$currentPassword)).toBe("OldPass1");
    });

    it("should update newPassword", async () => {
      const scope = fork();
      await allSettled(changePasswordModel.newPasswordChanged, { scope, params: "NewPass1" });
      expect(scope.getState(changePasswordModel.$newPassword)).toBe("NewPass1");
    });

    it("should update confirmPassword", async () => {
      const scope = fork();
      await allSettled(changePasswordModel.confirmPasswordChanged, { scope, params: "NewPass1" });
      expect(scope.getState(changePasswordModel.$confirmPassword)).toBe("NewPass1");
    });

    it("should reset all fields on formReset", async () => {
      const scope = fork({
        values: [
          [changePasswordModel.$currentPassword, "old"],
          [changePasswordModel.$newPassword, "new"],
          [changePasswordModel.$confirmPassword, "confirm"],
          [changePasswordModel.$error, "some error"],
        ],
      });

      await allSettled(changePasswordModel.formReset, { scope });

      expect(scope.getState(changePasswordModel.$currentPassword)).toBe("");
      expect(scope.getState(changePasswordModel.$newPassword)).toBe("");
      expect(scope.getState(changePasswordModel.$confirmPassword)).toBe("");
      expect(scope.getState(changePasswordModel.$error)).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should clear error on field change", async () => {
      const scope = fork({ values: [[changePasswordModel.$error, "some error"]] });

      await allSettled(changePasswordModel.currentPasswordChanged, { scope, params: "x" });
      expect(scope.getState(changePasswordModel.$error)).toBeNull();
    });

    it("should set error on changePasswordFx failure", async () => {
      const axiosError = {
        response: { data: { error: "Неверный текущий пароль" } },
        message: "Request failed",
      };
      vi.mocked(authApi.changePassword).mockRejectedValueOnce(axiosError);

      const scope = fork();
      await allSettled(changePasswordModel.changePasswordFx, {
        scope,
        params: {
          currentPassword: "wrong",
          newPassword: "NewPass1",
          confirmPassword: "NewPass1",
        },
      });

      expect(scope.getState(changePasswordModel.$error)).toBe("Неверный текущий пароль");
    });
  });

  describe("form submission", () => {
    it("should call changePasswordFx on formSubmitted", async () => {
      vi.mocked(authApi.changePassword).mockResolvedValueOnce({
        message: "Пароль успешно изменён",
        token: "fresh-jwt-token",
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00.000Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
      });

      const scope = fork({
        values: [
          [changePasswordModel.$currentPassword, "OldPass1"],
          [changePasswordModel.$newPassword, "NewPass1"],
          [changePasswordModel.$confirmPassword, "NewPass1"],
        ],
      });

      await allSettled(changePasswordModel.formSubmitted, { scope });

      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: "OldPass1",
        newPassword: "NewPass1",
        confirmPassword: "NewPass1",
      });
    });

    it("should reset form after successful change", async () => {
      vi.mocked(authApi.changePassword).mockResolvedValueOnce({
        message: "Пароль успешно изменён",
        token: "fresh-jwt-token",
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00.000Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
      });

      const scope = fork({
        values: [
          [changePasswordModel.$currentPassword, "OldPass1"],
          [changePasswordModel.$newPassword, "NewPass1"],
          [changePasswordModel.$confirmPassword, "NewPass1"],
        ],
      });

      await allSettled(changePasswordModel.formSubmitted, { scope });

      expect(scope.getState(changePasswordModel.$currentPassword)).toBe("");
      expect(scope.getState(changePasswordModel.$newPassword)).toBe("");
      expect(scope.getState(changePasswordModel.$confirmPassword)).toBe("");
    });
  });

  describe("dialog open/close", () => {
    it("should open dialog on dialogOpened", async () => {
      const scope = fork();

      await allSettled(changePasswordModel.dialogOpened, { scope });

      expect(scope.getState(changePasswordModel.$isDialogOpen)).toBe(true);
    });

    it("should close dialog and reset form on dialogClosed", async () => {
      const scope = fork({
        values: [
          [changePasswordModel.$isDialogOpen, true],
          [changePasswordModel.$currentPassword, "old"],
          [changePasswordModel.$newPassword, "new"],
          [changePasswordModel.$confirmPassword, "confirm"],
        ],
      });

      await allSettled(changePasswordModel.dialogClosed, { scope });

      expect(scope.getState(changePasswordModel.$isDialogOpen)).toBe(false);
      expect(scope.getState(changePasswordModel.$currentPassword)).toBe("");
      expect(scope.getState(changePasswordModel.$newPassword)).toBe("");
      expect(scope.getState(changePasswordModel.$confirmPassword)).toBe("");
    });

    it("should close dialog after successful change", async () => {
      vi.mocked(authApi.changePassword).mockResolvedValueOnce({
        message: "Пароль успешно изменён",
        token: "fresh-jwt-token",
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00.000Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
      });

      const scope = fork({
        values: [
          [changePasswordModel.$isDialogOpen, true],
          [changePasswordModel.$currentPassword, "OldPass1"],
          [changePasswordModel.$newPassword, "NewPass1"],
          [changePasswordModel.$confirmPassword, "NewPass1"],
        ],
      });

      await allSettled(changePasswordModel.formSubmitted, { scope });

      expect(scope.getState(changePasswordModel.$isDialogOpen)).toBe(false);
    });
  });
});
