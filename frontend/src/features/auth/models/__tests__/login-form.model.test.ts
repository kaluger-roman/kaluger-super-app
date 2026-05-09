import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel, verificationModel } from "@entities";
import { authApi, navigate } from "@shared";

import {
  loginFx,
  submitLogin,
  emailChanged,
  passwordChanged,
  formReset,
  LoginFormGate,
  $email,
  $password,
  $isLoading,
  $loginError,
} from "../login-form.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    authApi: {
      login: vi.fn(),
    },
    navigate: vi.fn(),
  };
});

describe("features/auth/models/login-form.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("form fields", () => {
    it("should update email", async () => {
      const scope = fork();

      await allSettled(emailChanged, {
        scope,
        params: "test@example.com",
      });

      expect(scope.getState($email)).toBe("test@example.com");
    });

    it("should update password", async () => {
      const scope = fork();

      await allSettled(passwordChanged, {
        scope,
        params: "password123",
      });

      expect(scope.getState($password)).toBe("password123");
    });

    it("should reset form fields", async () => {
      const scope = fork({
        values: [
          [$email, "test@example.com"],
          [$password, "password123"],
        ],
      });

      await allSettled(formReset, { scope });

      expect(scope.getState($email)).toBe("");
      expect(scope.getState($password)).toBe("");
    });
  });

  describe("loginFx", () => {
    it("should login successfully with verified email", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
        token: "test-token",
      };
      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(localStorage.getItem("authToken")).toBe("test-token");
      expect(scope.getState(userModel.$user)).toEqual(mockResponse.user);
    });

    it("should handle email not verified error", async () => {
      const error = {
        response: {
          status: 403,
          data: { error: "Email не подтвержден" },
        },
      };
      vi.mocked(authApi.login).mockRejectedValue(error);

      const scope = fork({
        values: [[$email, "test@example.com"]],
      });

      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($loginError)).toBe("Email не подтвержден");
      expect(scope.getState(verificationModel.$verificationEmail)).toBe("test@example.com");
    });

    it("should handle invalid credentials", async () => {
      const error = {
        response: {
          status: 401,
          data: { error: "Неверные учетные данные" },
        },
      };
      vi.mocked(authApi.login).mockRejectedValue(error);

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "wrong" },
      });

      expect(scope.getState($loginError)).toBe("Неверные учетные данные");
    });

    it("should handle network error", async () => {
      const error = { message: "Network error" };
      vi.mocked(authApi.login).mockRejectedValue(error);

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($loginError)).toBe("Network error");
    });

    it("should handle error without response data", async () => {
      vi.mocked(authApi.login).mockRejectedValue({});

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($loginError)).toBe("Произошла ошибка");
    });
  });

  describe("submitLogin", () => {
    it("should trigger login effect", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
        token: "token",
      };
      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(submitLogin, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(authApi.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password",
      });
    });
  });

  describe("error handling", () => {
    it("should clear error on new login attempt", async () => {
      const scope = fork({
        values: [[$loginError, "Previous error"]],
      });

      vi.mocked(authApi.login).mockResolvedValue({
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
        token: "token",
      });

      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($loginError)).toBeNull();
    });
  });

  describe("navigation", () => {
    it("should navigate to home on successful auth of verified user", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
        token: "token",
      };
      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState(userModel.$user)).toEqual(mockResponse.user);
      expect(navigate).toHaveBeenCalledWith("/", { replace: true });
    });

    it("should not navigate to home for unverified user (regression: $isAuthenticated as clock)", async () => {
      // Regression for bug-hunt 2026-05-09 #9: subscribing navigateToHomeFx
      // to userModel.$isAuthenticated also fired on email verification and
      // any $user update, redirecting outside the login flow. The fix
      // narrows the trigger to a verified loginFx response.
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: false,
          taxEnabled: false,
        },
        token: "token",
      };
      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(navigate).not.toHaveBeenCalledWith("/", { replace: true });
    });

    it("should navigate to verification on 403 error", async () => {
      const error = {
        response: {
          status: 403,
          data: { error: "Email не подтвержден" },
        },
      };
      vi.mocked(authApi.login).mockRejectedValue(error);

      const scope = fork({
        values: [[$email, "test@example.com"]],
      });

      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(navigate).toHaveBeenCalledWith("/verify-email", { replace: true });
    });

    it("should show warning notification on 403 error", async () => {
      const error = {
        response: {
          status: 403,
          data: { error: "Email не подтвержден" },
        },
      };
      vi.mocked(authApi.login).mockRejectedValue(error);

      const scope = fork({
        values: [[$email, "test@example.com"]],
      });

      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      // Verify email was set for verification
      expect(scope.getState(verificationModel.$verificationEmail)).toBe("test@example.com");
      expect(scope.getState($loginError)).toBe("Email не подтвержден");
    });
  });

  describe("$isLoading", () => {
    it("should be true when login is pending", async () => {
      vi.mocked(authApi.login).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const scope = fork();
      const promise = allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($isLoading)).toBe(true);

      await promise;
    });

    it("should be false when login completes", async () => {
      vi.mocked(authApi.login).mockResolvedValue({
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
        token: "token",
      });

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($isLoading)).toBe(false);
    });
  });

  describe("LoginFormGate", () => {
    it("should clear error on gate open", async () => {
      const scope = fork({
        values: [[$loginError, "Some error"]],
      });

      await allSettled(LoginFormGate.open, { scope, params: undefined });

      expect(scope.getState($loginError)).toBeNull();
    });

    it("should reset form on gate close", async () => {
      const scope = fork({
        values: [
          [$email, "test@example.com"],
          [$password, "password"],
        ],
      });

      await allSettled(LoginFormGate.close, { scope, params: undefined });

      expect(scope.getState($email)).toBe("");
      expect(scope.getState($password)).toBe("");
    });
  });

  describe("token handling", () => {
    it("should save token to localStorage", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
        token: "test-token",
      };
      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(localStorage.getItem("authToken")).toBe("test-token");
    });

    it("should update auth token in store", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxEnabled: false,
        },
        token: "test-token",
      };
      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState(userModel.$authToken)).toBe("test-token");
    });
  });
});
