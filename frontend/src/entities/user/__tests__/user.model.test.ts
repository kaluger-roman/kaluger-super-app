import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { authApi } from "@shared";

import {
  loginUser,
  registerUser,
  logoutUser,
  setAuthToken,
  clearAuthError,
  loginFx,
  getProfileFx,
  $user,
  $isAuthenticated,
  $authToken,
  $authError,
} from "../user.model";

vi.mock("@shared", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getProfile: vi.fn(),
  },
}));

describe("user.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("loginFx", () => {
    it("should login user successfully", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00Z",
        },
        token: "test-token",
      };
      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(loginUser, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($user)).toEqual(mockResponse.user);
      expect(scope.getState($authToken)).toBe("test-token");
      expect(scope.getState($isAuthenticated)).toBe(true);
      expect(localStorage.getItem("authToken")).toBe("test-token");
    });

    it("should handle login error", async () => {
      const error = {
        response: { data: { error: "Invalid credentials" } },
      };
      vi.mocked(authApi.login).mockRejectedValue(error);

      const scope = fork();
      await allSettled(loginUser, {
        scope,
        params: { email: "test@example.com", password: "wrong" },
      });

      expect(scope.getState($user)).toBeNull();
      expect(scope.getState($authError)).toBe("Invalid credentials");
    });

    it("should clear error on new login attempt", async () => {
      const scope = fork({
        values: [[$authError, "Previous error"]],
      });

      vi.mocked(authApi.login).mockResolvedValue({
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
        },
        token: "token",
      });

      await allSettled(loginUser, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($authError)).toBeNull();
    });
  });

  describe("registerFx", () => {
    it("should register user successfully", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "new@example.com",
          name: "New User",
          createdAt: "2024-01-01T00:00:00Z",
        },
        token: "new-token",
      };
      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const scope = fork();
      await allSettled(registerUser, {
        scope,
        params: { email: "new@example.com", password: "password", name: "New User" },
      });

      expect(scope.getState($user)).toEqual(mockResponse.user);
      expect(scope.getState($authToken)).toBe("new-token");
      expect(scope.getState($isAuthenticated)).toBe(true);
      expect(localStorage.getItem("authToken")).toBe("new-token");
    });

    it("should handle registration error", async () => {
      const error = {
        response: { data: { error: "Email already exists" } },
      };
      vi.mocked(authApi.register).mockRejectedValue(error);

      const scope = fork();
      await allSettled(registerUser, {
        scope,
        params: { email: "exists@example.com", password: "password", name: "User" },
      });

      expect(scope.getState($user)).toBeNull();
      expect(scope.getState($authError)).toBe("Email already exists");
    });
  });

  describe("getProfileFx", () => {
    it("should fetch user profile", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2024-01-01T00:00:00Z",
      };
      vi.mocked(authApi.getProfile).mockResolvedValue(mockUser);

      const scope = fork();
      await allSettled(getProfileFx, { scope });

      expect(scope.getState($user)).toEqual(mockUser);
      expect(scope.getState($isAuthenticated)).toBe(true);
    });
  });

  describe("logoutUser", () => {
    it("should clear user and token on logout", async () => {
      localStorage.setItem("authToken", "test-token");
      const scope = fork({
        values: [
          [
            $user,
            { id: "1", email: "test@example.com", name: "Test", createdAt: "2024-01-01T00:00:00Z" },
          ],
          [$authToken, "test-token"],
        ],
      });

      await allSettled(logoutUser, { scope });

      expect(scope.getState($user)).toBeNull();
      expect(scope.getState($authToken)).toBeNull();
      expect(scope.getState($isAuthenticated)).toBe(false);
      expect(localStorage.getItem("authToken")).toBeNull();
    });
  });

  describe("setAuthToken", () => {
    it("should update auth token", async () => {
      const scope = fork();
      await allSettled(setAuthToken, { scope, params: "new-token" });

      expect(scope.getState($authToken)).toBe("new-token");
    });
  });

  describe("clearAuthError", () => {
    it("should clear auth error", async () => {
      const scope = fork({
        values: [[$authError, "Some error"]],
      });

      await allSettled(clearAuthError, { scope });

      expect(scope.getState($authError)).toBeNull();
    });
  });

  describe("$isLoading", () => {
    it("should be true when any effect is pending", async () => {
      vi.mocked(authApi.login).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const scope = fork();
      const promise = allSettled(loginUser, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      // Check loading state before promise resolves
      expect(scope.getState(loginFx.pending)).toBe(true);

      await promise;
    });
  });

  describe("error handling", () => {
    it("should handle error without response data", async () => {
      const error = { message: "Network error" };
      vi.mocked(authApi.login).mockRejectedValue(error);

      const scope = fork();
      await allSettled(loginUser, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($authError)).toBe("Network error");
    });

    it("should handle error with fallback message", async () => {
      vi.mocked(authApi.login).mockRejectedValue({});

      const scope = fork();
      await allSettled(loginUser, {
        scope,
        params: { email: "test@example.com", password: "password" },
      });

      expect(scope.getState($authError)).toBe("Произошла ошибка");
    });
  });
});
