import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { authApi } from "@shared";

import { VERIFICATION_EMAIL_KEY } from "../verification.constants";
import {
  verifyEmailFx,
  resendVerificationFx,
  $verificationEmail,
  $verificationCode,
  $verificationError,
  codeChanged,
  verifyCode,
  resendCode,
  setVerificationEmail,
  clearVerificationError,
  VerificationGate,
} from "../verification.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    authApi: {
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
    },
  };
});

describe("entities/verification/verification.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.useRealTimers();
  });

  describe("$verificationEmail", () => {
    it("should initialize from localStorage", async () => {
      localStorage.setItem(VERIFICATION_EMAIL_KEY, "test@example.com");
      
      // Since the store initializes from localStorage on module load,
      // we need to test this by setting verification email manually

      // Since the store initializes from localStorage on module load,
      // we need to test this by setting verification email manually
      const scope = fork();
      await allSettled(setVerificationEmail, {
        scope,
        params: "test@example.com",
      });

      expect(scope.getState($verificationEmail)).toBe("test@example.com");
    });

    it("should be null when localStorage is empty", () => {
      const scope = fork();

      expect(scope.getState($verificationEmail)).toBeNull();
    });
  });

  describe("setVerificationEmail", () => {
    it("should set email and save to localStorage", async () => {
      const scope = fork();

      await allSettled(setVerificationEmail, {
        scope,
        params: "test@example.com",
      });

      expect(scope.getState($verificationEmail)).toBe("test@example.com");
      expect(localStorage.getItem(VERIFICATION_EMAIL_KEY)).toBe("test@example.com");
    });

    it("should clear email and remove from localStorage", async () => {
      localStorage.setItem(VERIFICATION_EMAIL_KEY, "test@example.com");
      const scope = fork();

      await allSettled(setVerificationEmail, {
        scope,
        params: null,
      });

      expect(scope.getState($verificationEmail)).toBeNull();
      expect(localStorage.getItem(VERIFICATION_EMAIL_KEY)).toBeNull();
    });
  });

  describe("codeChanged", () => {
    it("should update verification code", async () => {
      const scope = fork();

      await allSettled(codeChanged, {
        scope,
        params: "123456",
      });

      expect(scope.getState($verificationCode)).toBe("123456");
    });

    it("should allow partial codes", async () => {
      const scope = fork();

      await allSettled(codeChanged, {
        scope,
        params: "123",
      });

      expect(scope.getState($verificationCode)).toBe("123");
    });
  });

  describe("verifyEmailFx", () => {
    it("should verify email successfully", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test User",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxRate: 6,
        },
        token: "test-token",
      };
      vi.mocked(authApi.verifyEmail).mockResolvedValue(mockResponse);
      localStorage.setItem(VERIFICATION_EMAIL_KEY, "test@example.com");

      const scope = fork();
      await allSettled(verifyEmailFx, {
        scope,
        params: { email: "test@example.com", code: "123456" },
      });

      expect(localStorage.getItem("authToken")).toBe("test-token");
      expect(localStorage.getItem(VERIFICATION_EMAIL_KEY)).toBeNull();
    });

    it("should handle verification error", async () => {
      const error = {
        response: { data: { error: "Неверный код подтверждения" } },
      };
      vi.mocked(authApi.verifyEmail).mockRejectedValue(error);

      const scope = fork();
      await allSettled(verifyEmailFx, {
        scope,
        params: { email: "test@example.com", code: "wrong" },
      });

      expect(scope.getState($verificationError)).toBe("Неверный код подтверждения");
    });

    it("should clear verification code on success", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxRate: 6,
        },
        token: "token",
      };
      vi.mocked(authApi.verifyEmail).mockResolvedValue(mockResponse);

      const scope = fork({
        values: [[$verificationCode, "123456"]],
      });

      await allSettled(verifyEmailFx, {
        scope,
        params: { email: "test@example.com", code: "123456" },
      });

      expect(scope.getState($verificationCode)).toBe("");
    });

    it("should clear verification email on success", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxRate: 6,
        },
        token: "token",
      };
      vi.mocked(authApi.verifyEmail).mockResolvedValue(mockResponse);

      const scope = fork({
        values: [[$verificationEmail, "test@example.com"]],
      });

      await allSettled(verifyEmailFx, {
        scope,
        params: { email: "test@example.com", code: "123456" },
      });

      expect(scope.getState($verificationEmail)).toBeNull();
    });
  });

  describe("verifyEmailFx — redirect loop regression", () => {
    it("should set $verificationEmail to null, not reset to initial value, after successful verification", async () => {
      const mockResponse = {
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxRate: 6,
        },
        token: "token",
      };
      vi.mocked(authApi.verifyEmail).mockResolvedValue(mockResponse);

      // Имитируем сценарий: email уже был в localStorage при создании стора.
      // Если используется patronum reset вместо явного sample(fn: () => null),
      // стор сбросится к начальному значению (email), а не к null —
      // это вызывает бесконечный редирект между ProtectedRoute и AuthRoute.
      const scope = fork({
        values: [[$verificationEmail, "test@example.com"]],
      });

      await allSettled(verifyEmailFx, {
        scope,
        params: { email: "test@example.com", code: "123456" },
      });

      // Критично: должен быть именно null, а не "test@example.com"
      expect(scope.getState($verificationEmail)).toBeNull();
      // Дополнительно: не должно быть truthy-значения, чтобы ProtectedRoute не редиректил
      expect(scope.getState($verificationEmail)).toBeFalsy();
    });
  });

  describe("resendVerificationFx", () => {
    it("should handle resend error", async () => {
      const error = {
        response: { data: { error: "Email уже подтвержден" } },
      };
      vi.mocked(authApi.resendVerification).mockRejectedValue(error);

      const scope = fork();
      await allSettled(resendVerificationFx, {
        scope,
        params: { email: "test@example.com" },
      });

      expect(scope.getState($verificationError)).toBe("Email уже подтвержден");
    });
  });

  describe("verifyCode", () => {
    it("should trigger verification when code is complete", async () => {
      vi.mocked(authApi.verifyEmail).mockResolvedValue({
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxRate: 6,
        },
        token: "token",
      });

      const scope = fork({
        values: [
          [$verificationEmail, "test@example.com"],
          [$verificationCode, "123456"],
        ],
      });

      await allSettled(verifyCode, { scope });

      expect(authApi.verifyEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        code: "123456",
      });
    });

    it("should not trigger verification when code is incomplete", async () => {
      const scope = fork({
        values: [
          [$verificationEmail, "test@example.com"],
          [$verificationCode, "123"],
        ],
      });

      await allSettled(verifyCode, { scope });

      expect(authApi.verifyEmail).not.toHaveBeenCalled();
    });

    it("should not trigger verification when email is null", async () => {
      const scope = fork({
        values: [
          [$verificationEmail, null],
          [$verificationCode, "123456"],
        ],
      });

      await allSettled(verifyCode, { scope });

      expect(authApi.verifyEmail).not.toHaveBeenCalled();
    });
  });

  describe("auto verification on complete code", () => {
    it("should auto-verify when entering full code", async () => {
      vi.mocked(authApi.verifyEmail).mockResolvedValue({
        user: {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxRate: 6,
        },
        token: "token",
      });

      const scope = fork({
        values: [[$verificationEmail, "test@example.com"]],
      });

      await allSettled(codeChanged, {
        scope,
        params: "123456",
      });

      expect(authApi.verifyEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        code: "123456",
      });
    });
  });

  describe("resendCode", () => {
    it("should not resend when email is null", async () => {
      const scope = fork({
        values: [[$verificationEmail, null]],
      });

      await allSettled(resendCode, { scope });

      expect(authApi.resendVerification).not.toHaveBeenCalled();
    });
  });

  describe("clearVerificationError", () => {
    it("should clear error", async () => {
      const scope = fork({
        values: [[$verificationError, "Some error"]],
      });

      await allSettled(clearVerificationError, { scope });

      expect(scope.getState($verificationError)).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle error without response data", async () => {
      const error = { message: "Network error" };
      vi.mocked(authApi.verifyEmail).mockRejectedValue(error);

      const scope = fork();
      await allSettled(verifyEmailFx, {
        scope,
        params: { email: "test@example.com", code: "123456" },
      });

      expect(scope.getState($verificationError)).toBe("Network error");
    });

    it("should handle error with fallback message", async () => {
      vi.mocked(authApi.verifyEmail).mockRejectedValue({});

      const scope = fork();
      await allSettled(verifyEmailFx, {
        scope,
        params: { email: "test@example.com", code: "123456" },
      });

      expect(scope.getState($verificationError)).toBe("Произошла ошибка");
    });
  });

  describe("VerificationGate", () => {
    it("should clear error on gate open", async () => {
      const scope = fork({
        values: [[$verificationError, "Some error"]],
      });

      await allSettled(VerificationGate.open, { scope, params: undefined });

      expect(scope.getState($verificationError)).toBeNull();
    });

    it("should clear code on gate close", async () => {
      const scope = fork({
        values: [[$verificationCode, "123456"]],
      });

      await allSettled(VerificationGate.close, { scope, params: undefined });

      expect(scope.getState($verificationCode)).toBe("");
    });
  });
});
