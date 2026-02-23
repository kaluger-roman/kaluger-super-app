import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { authApi } from "@shared";

import { verificationModel } from "../../verification";
import { getProfileFx, $user } from "../user.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    authApi: {
      getProfile: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    },
    navigate: vi.fn(),
  };
});

describe("entities/user/user.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("getProfileFx — cross-device verification regression", () => {
    it("should clear $verificationEmail when profile shows email is already verified", async () => {
      // Scenario: email was verified on another device.
      // This device still has verificationEmail in localStorage from a previous session.
      // getProfileFx returns isEmailVerified: true — must clear $verificationEmail
      // to prevent infinite redirect loop between ProtectedRoute and AuthRoute.
      localStorage.setItem("verificationEmail", "test@example.com");

      const verifiedUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2024-01-01T00:00:00Z",
        isEmailVerified: true,
      };
      vi.mocked(authApi.getProfile).mockResolvedValue(verifiedUser);

      const scope = fork({
        values: [
          [verificationModel.$verificationEmail, "test@example.com"],
        ],
      });

      await allSettled(getProfileFx, { scope });

      expect(scope.getState(verificationModel.$verificationEmail)).toBeNull();
      expect(localStorage.getItem("verificationEmail")).toBeNull();
    });

    it("should set $verificationEmail when profile shows email is not verified", async () => {
      const unverifiedUser = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2024-01-01T00:00:00Z",
        isEmailVerified: false,
      };
      vi.mocked(authApi.getProfile).mockResolvedValue(unverifiedUser);

      const scope = fork();

      await allSettled(getProfileFx, { scope });

      expect(scope.getState(verificationModel.$verificationEmail)).toBe("test@example.com");
      expect(localStorage.getItem("verificationEmail")).toBe("test@example.com");
    });

    it("should update $user on successful profile fetch", async () => {
      const user = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2024-01-01T00:00:00Z",
        isEmailVerified: true,
      };
      vi.mocked(authApi.getProfile).mockResolvedValue(user);

      const scope = fork();

      await allSettled(getProfileFx, { scope });

      expect(scope.getState($user)).toEqual(user);
    });
  });
});
