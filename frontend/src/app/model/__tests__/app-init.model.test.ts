import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { loginFormModel } from "@features/auth";
import { studentsApi, lessonsApi, authApi } from "@shared";

import {
  $appInitialized,
  appBootedUnauthenticated,
  initializeAppFx,
} from "../app-init.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    studentsApi: {
      getAll: vi.fn(),
    },
    lessonsApi: {
      getUpcoming: vi.fn(),
    },
    authApi: {
      login: vi.fn(),
    },
    navigate: vi.fn(),
  };
});

describe("app/model/app-init.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("initializeAppFx re-fire after login", () => {
    it("should refire initializeAppFx on successful login", async () => {
      vi.mocked(studentsApi.getAll).mockResolvedValue([]);
      vi.mocked(lessonsApi.getUpcoming).mockResolvedValue([]);
      vi.mocked(authApi.login).mockResolvedValue({
        user: {
          id: "1",
          email: "user@test.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxRate: 6,
        },
        token: "new-token",
      });

      const scope = fork();

      await allSettled(loginFormModel.loginFx, {
        scope,
        params: { email: "user@test.com", password: "pass" },
      });

      // After successful login, initializeAppFx should be triggered,
      // which loads students and upcoming lessons.
      expect(studentsApi.getAll).toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).toHaveBeenCalled();
    });

    it("should not refire initializeAppFx on failed login", async () => {
      vi.mocked(studentsApi.getAll).mockResolvedValue([]);
      vi.mocked(lessonsApi.getUpcoming).mockResolvedValue([]);
      vi.mocked(authApi.login).mockRejectedValue({
        response: { status: 401, data: { error: "Неверные данные" } },
      });

      const scope = fork();

      await allSettled(loginFormModel.loginFx, {
        scope,
        params: { email: "user@test.com", password: "wrong" },
      });

      expect(studentsApi.getAll).not.toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).not.toHaveBeenCalled();
    });
  });

  describe("initializeAppFx", () => {
    it("should load students and upcoming lessons", async () => {
      vi.mocked(studentsApi.getAll).mockResolvedValue([]);
      vi.mocked(lessonsApi.getUpcoming).mockResolvedValue([]);

      const scope = fork();

      await allSettled(initializeAppFx, { scope, params: {} });

      expect(studentsApi.getAll).toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).toHaveBeenCalled();
    });
  });

  describe("appBootedUnauthenticated", () => {
    it("should mark app as initialized without loading data", async () => {
      const scope = fork();

      await allSettled(appBootedUnauthenticated, { scope });

      expect(scope.getState($appInitialized)).toBe(true);
      expect(studentsApi.getAll).not.toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).not.toHaveBeenCalled();
    });
  });
});
