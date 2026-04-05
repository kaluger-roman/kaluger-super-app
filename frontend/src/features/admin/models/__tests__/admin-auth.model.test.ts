import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { adminApiMethods, adminTokenInvalidated } from "@shared";

import {
  loginFx,
  loginSubmitted,
  emailChanged,
  passwordChanged,
  loggedOut,
  $adminToken,
  $isAdminAuthenticated,
  $loginError,
  $email,
  $password,
} from "../admin-auth.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    adminApiMethods: {
      login: vi.fn(),
    },
  };
});

describe("features/admin/models/admin-auth.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("form fields", () => {
    it("should update email", async () => {
      const scope = fork();

      await allSettled(emailChanged, { scope, params: "admin@test.com" });

      expect(scope.getState($email)).toBe("admin@test.com");
    });

    it("should update password", async () => {
      const scope = fork();

      await allSettled(passwordChanged, { scope, params: "secret123" });

      expect(scope.getState($password)).toBe("secret123");
    });
  });

  describe("loginFx", () => {
    it("should set token on successful login", async () => {
      vi.mocked(adminApiMethods.login).mockResolvedValue({
        token: "admin-token-123",
      });

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "admin@test.com", password: "pass" },
      });

      expect(scope.getState($adminToken)).toBe("admin-token-123");
      expect(scope.getState($isAdminAuthenticated)).toBe(true);
    });

    it("should set login error on failed login", async () => {
      const error = {
        response: { data: { error: "Неверный email или пароль" } },
      };
      vi.mocked(adminApiMethods.login).mockRejectedValue(error);

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "admin@test.com", password: "wrong" },
      });

      expect(scope.getState($loginError)).toBe("Неверный email или пароль");
    });

    it("should use fallback error message when no response data", async () => {
      vi.mocked(adminApiMethods.login).mockRejectedValue({});

      const scope = fork();
      await allSettled(loginFx, {
        scope,
        params: { email: "admin@test.com", password: "wrong" },
      });

      expect(scope.getState($loginError)).toBe("Ошибка авторизации");
    });

    it("should clear password after successful login", async () => {
      vi.mocked(adminApiMethods.login).mockResolvedValue({
        token: "admin-token-123",
      });

      const scope = fork({
        values: [[$password, "secret123"]],
      });

      await allSettled(loginFx, {
        scope,
        params: { email: "admin@test.com", password: "secret123" },
      });

      expect(scope.getState($password)).toBe("");
    });
  });

  describe("loginSubmitted", () => {
    it("should clear login error on submit", async () => {
      vi.mocked(adminApiMethods.login).mockResolvedValue({
        token: "token",
      });

      const scope = fork({
        values: [
          [$loginError, "Previous error"],
          [$email, "admin@test.com"],
          [$password, "pass"],
        ],
      });

      await allSettled(loginSubmitted, { scope });

      expect(scope.getState($loginError)).toBeNull();
    });
  });

  describe("logout", () => {
    it("should clear admin token on logout", async () => {
      const scope = fork({
        values: [[$adminToken, "admin-token-123"]],
      });

      await allSettled(loggedOut, { scope });

      expect(scope.getState($adminToken)).toBeNull();
      expect(scope.getState($isAdminAuthenticated)).toBe(false);
    });
  });

  describe("adminTokenInvalidated", () => {
    it("should clear admin token when token is invalidated", async () => {
      const scope = fork({
        values: [[$adminToken, "expired-token"]],
      });

      await allSettled(adminTokenInvalidated, { scope });

      expect(scope.getState($adminToken)).toBeNull();
      expect(scope.getState($isAdminAuthenticated)).toBe(false);
    });
  });
});
