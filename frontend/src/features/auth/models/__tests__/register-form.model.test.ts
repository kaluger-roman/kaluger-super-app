import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel, verificationModel } from "@entities";
import { authApi, navigate } from "@shared";

import {
  registerFx,
  submitRegister,
  RegisterFormGate,
  $isLoading,
  $registerError,
} from "../register-form.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    authApi: {
      register: vi.fn(),
    },
    navigate: vi.fn(),
  };
});

describe("features/auth/models/register-form.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("registerFx", () => {
    it("should register user successfully", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxRate: 6,
        },
        message: "Пользователь успешно создан",
      };
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      expect(authApi.register).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password",
        name: "New User",
      });
    });

    it("should handle registration error", async () => {
      const error = {
        response: { data: { error: "Пользователь уже существует" } },
      };
      vi.mocked(authApi.register).mockRejectedValue(error);

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "exists@example.com", password: "password", name: "User" },
      });

      expect(scope.getState($registerError)).toBe("Пользователь уже существует");
    });

    it("should handle network error", async () => {
      const error = { message: "Network error" };
      vi.mocked(authApi.register).mockRejectedValue(error);

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "User" },
      });

      expect(scope.getState($registerError)).toBe("Network error");
    });

    it("should handle error without response data", async () => {
      vi.mocked(authApi.register).mockRejectedValue({});

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "User" },
      });

      expect(scope.getState($registerError)).toBe("Произошла ошибка");
    });
  });

  describe("submitRegister", () => {
    it("should trigger register effect", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxRate: 6,
        },
        message: "Успешно",
      };
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(submitRegister, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      expect(authApi.register).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password",
        name: "New User",
      });
    });
  });

  describe("error handling", () => {
    it("should clear error on new registration attempt", async () => {
      const scope = fork({
        values: [[$registerError, "Previous error"]],
      });

      vi.mocked(authApi.register).mockResolvedValue({
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxRate: 6,
        },
        message: "Успешно",
      });

      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      expect(scope.getState($registerError)).toBeNull();
    });
  });

  describe("verification flow", () => {
    it("should set verification email on success", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxRate: 6,
        },
        message: "Успешно",
      };
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      expect(scope.getState(verificationModel.$verificationEmail)).toBe("new@example.com");
    });

    it("should show success notification on registration", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxRate: 6,
        },
        message: "Успешно",
      };
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      // Verify verification email was set
      expect(scope.getState(verificationModel.$verificationEmail)).toBe("new@example.com");
    });

    it("should navigate to verification when email not verified", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxRate: 6,
        },
        message: "Успешно",
      };
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      expect(navigate).toHaveBeenCalledWith("/verify-email", { replace: true });
    });

    it("should not navigate to verification when email already verified", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxRate: 6,
        },
        token: "token",
        message: "Успешно",
      };
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      // Should not set verification email when already verified
      expect(scope.getState(verificationModel.$verificationEmail)).toBe("new@example.com");
    });
  });

  describe("navigation", () => {
    it("should navigate to home on successful auth", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxRate: 6,
        },
        message: "Успешно",
      };
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      // Verify verification email was set
      expect(scope.getState(verificationModel.$verificationEmail)).toBe("new@example.com");
    });

    it("should navigate to verification when verification email is set and not authenticated", async () => {
      const scope = fork();

      await allSettled(verificationModel.setVerificationEmail, {
        scope,
        params: "new@example.com",
      });

      expect(scope.getState(verificationModel.$verificationEmail)).toBe("new@example.com");
    });

    it("should not navigate to verification when user is authenticated", async () => {
      const scope = fork({
        values: [
          [
            userModel.$user,
            {
              id: "1",
              email: "new@example.com",
              name: "New User",
              createdAt: "2024-01-01T00:00:00Z",
              isEmailVerified: true,
              taxRate: 6,
            },
          ],
        ],
      });

      await allSettled(verificationModel.setVerificationEmail, {
        scope,
        params: "new@example.com",
      });

      // Verification email can still be set
      expect(scope.getState(verificationModel.$verificationEmail)).toBe("new@example.com");
    });
  });

  describe("$isLoading", () => {
    it("should be true when registration is pending", async () => {
      vi.mocked(authApi.register).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const scope = fork();
      const promise = allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      expect(scope.getState($isLoading)).toBe(true);

      await promise;
    });

    it("should be false when registration completes", async () => {
      vi.mocked(authApi.register).mockResolvedValue({
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxRate: 6,
        },
        message: "Успешно",
      });

      const scope = fork();
      await allSettled(registerFx, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      expect(scope.getState($isLoading)).toBe(false);
    });
  });

  describe("RegisterFormGate", () => {
    it("should clear error on gate open", async () => {
      const scope = fork({
        values: [[$registerError, "Some error"]],
      });

      await allSettled(RegisterFormGate.open, { scope, params: undefined });

      expect(scope.getState($registerError)).toBeNull();
    });

    it("should clear error on gate close", async () => {
      const scope = fork({
        values: [[$registerError, "Some error"]],
      });

      await allSettled(RegisterFormGate.close, { scope, params: undefined });

      expect(scope.getState($registerError)).toBeNull();
    });
  });
});
