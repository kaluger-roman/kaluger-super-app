import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { notificationsModel, studentUserModel, userModel } from "@entities";
import { loginFormModel } from "@features/auth";
import { callNotificationOpenModel } from "@features/videoCall";
import { studentsApi, lessonsApi, authApi, studentAuthApi } from "@shared";

import { signedInBackgroundHandlers } from "../../../__tests__/mocks/handlers";
import { server } from "../../../__tests__/mocks/server";
import {
  $appInitialized,
  appBootedUnauthenticated,
  appResumed,
  initializeAppFx,
  registerServiceWorkerFx,
  serviceWorkerMessaged,
} from "../appInit.model";

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
      getProfile: vi.fn(),
    },
    studentAuthApi: {
      getProfile: vi.fn(),
    },
    navigate: vi.fn(),
  };
});

describe("app/model/appInit.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    server.use(...signedInBackgroundHandlers);
  });

  describe("initializeAppFx re-fire after login", () => {
    it("should refire initializeAppFx on successful login", async () => {
      vi.mocked(studentsApi.getAll).mockResolvedValue([]);
      vi.mocked(lessonsApi.getUpcoming).mockResolvedValue({
        lessons: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      vi.mocked(authApi.login).mockResolvedValue({
        user: {
          id: "1",
          email: "user@test.com",
          name: "Test",
          createdAt: "2024-01-01T00:00:00Z",
          isEmailVerified: true,
          taxEnabled: false,
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
      vi.mocked(lessonsApi.getUpcoming).mockResolvedValue({
        lessons: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
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
      vi.mocked(lessonsApi.getUpcoming).mockResolvedValue({
        lessons: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const scope = fork();

      await allSettled(initializeAppFx, { scope, params: {} });

      expect(studentsApi.getAll).toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).toHaveBeenCalled();
    });

    it("keeps $appInitialized false until boot data actually loads (regression: init overlay dropped too early and loading screens stacked at startup)", async () => {
      const bootDataResolvers: Array<() => void> = [];

      vi.mocked(studentsApi.getAll).mockImplementation(
        () =>
          new Promise((resolve) => {
            bootDataResolvers.push(() => resolve([]));
          })
      );
      vi.mocked(lessonsApi.getUpcoming).mockImplementation(
        () =>
          new Promise((resolve) => {
            bootDataResolvers.push(() =>
              resolve({
                lessons: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
              })
            );
          })
      );

      const scope = fork();

      const settled = allSettled(initializeAppFx, { scope, params: {} });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(scope.getState($appInitialized)).toBe(false);

      bootDataResolvers.forEach((resolve) => resolve());
      await settled;

      expect(scope.getState($appInitialized)).toBe(true);
    });

    it("still registers the service worker when boot data fails (regression: failed boot request must not skip push/news setup)", async () => {
      vi.mocked(studentsApi.getAll).mockRejectedValue(new Error("Сеть недоступна"));
      vi.mocked(lessonsApi.getUpcoming).mockRejectedValue(new Error("Сеть недоступна"));
      const swHandler = vi.fn().mockResolvedValue(null);

      const scope = fork({ handlers: [[registerServiceWorkerFx, swHandler]] });

      await allSettled(initializeAppFx, { scope, params: {} });

      expect(scope.getState($appInitialized)).toBe(true);
      expect(swHandler).toHaveBeenCalled();
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

  describe("boot orchestration", () => {
    it("tutor boot — getProfileFx.done triggers initializeApp (loads tutor data)", async () => {
      vi.mocked(authApi.getProfile).mockResolvedValue({
        id: "u1",
        email: "tutor@test.com",
        name: "Tutor",
        createdAt: "2026-05-23T00:00:00Z",
        isEmailVerified: true,
        taxEnabled: false,
      });
      vi.mocked(studentsApi.getAll).mockResolvedValue([]);
      vi.mocked(lessonsApi.getUpcoming).mockResolvedValue({
        lessons: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const scope = fork();

      await allSettled(userModel.getProfileFx, { scope });

      expect(studentsApi.getAll).toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).toHaveBeenCalled();
      expect(scope.getState($appInitialized)).toBe(true);
    });

    it("tutor boot — getProfileFx.fail marks app initialized but does NOT load tutor data", async () => {
      vi.mocked(authApi.getProfile).mockRejectedValue({
        response: { status: 401 },
      });

      const scope = fork();

      await allSettled(userModel.getProfileFx, { scope });

      expect(scope.getState($appInitialized)).toBe(true);
      expect(studentsApi.getAll).not.toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).not.toHaveBeenCalled();
    });

    it("student boot — getCurrentStudentFx.done marks app initialized; tutor APIs are NOT called", async () => {
      vi.mocked(studentAuthApi.getProfile).mockResolvedValue({
        id: "s1",
        email: "student@test.com",
        name: "Student",
        isEmailVerified: true,
        tutor: null,
      });

      const scope = fork();

      await allSettled(studentUserModel.getCurrentStudentFx, { scope });

      expect(scope.getState($appInitialized)).toBe(true);
      expect(studentsApi.getAll).not.toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).not.toHaveBeenCalled();
    });

    it("student boot — getCurrentStudentFx.fail still marks app initialized (interceptor handles redirect)", async () => {
      vi.mocked(studentAuthApi.getProfile).mockRejectedValue({
        response: { status: 401 },
      });

      const scope = fork();

      await allSettled(studentUserModel.getCurrentStudentFx, { scope });

      expect(scope.getState($appInitialized)).toBe(true);
      expect(studentsApi.getAll).not.toHaveBeenCalled();
      expect(lessonsApi.getUpcoming).not.toHaveBeenCalled();
    });
  });

  describe("student call notifications", () => {
    it("should register the service worker and load the push key once a student signs in", async () => {
      const registration = {} as ServiceWorkerRegistration;
      const swHandler = vi.fn().mockResolvedValue(registration);
      const vapidHandler = vi.fn().mockResolvedValue("vapid-key");
      const scope = fork({
        handlers: [
          [registerServiceWorkerFx, swHandler],
          [notificationsModel.loadVapidKeyFx, vapidHandler],
          [notificationsModel.checkPushSubscriptionFx, () => false],
        ],
      });

      await allSettled(studentUserModel.studentSessionUpdated, {
        scope,
        params: {
          id: "s1",
          email: "student@test.com",
          name: "Student",
          isEmailVerified: true,
          tutor: null,
        },
      });

      expect(swHandler).toHaveBeenCalledTimes(1);
      expect(vapidHandler).toHaveBeenCalledTimes(1);
      expect(scope.getState(notificationsModel.$serviceWorkerRegistration)).toBe(registration);
      expect(scope.getState(notificationsModel.$vapidKey)).toBe("vapid-key");
    });

    it("should not register the service worker for a signed-out visitor", async () => {
      const swHandler = vi.fn().mockResolvedValue(null);
      const scope = fork({ handlers: [[registerServiceWorkerFx, swHandler]] });

      await allSettled(appBootedUnauthenticated, { scope });

      expect(swHandler).not.toHaveBeenCalled();
    });
  });

  describe("returning to the app", () => {
    it("should read the notification permission again for a signed-in tutor", async () => {
      vi.stubGlobal("Notification", { permission: "denied" });
      const scope = fork({
        values: [
          [
            userModel.$user,
            {
              id: "1",
              email: "user@test.com",
              name: "Test",
              createdAt: "2024-01-01T00:00:00Z",
              isEmailVerified: true,
            },
          ],
        ],
        handlers: [[initializeAppFx, () => []]],
      });

      await allSettled(appResumed, { scope });

      expect(scope.getState(notificationsModel.$pushPermission)).toBe("denied");
    });
  });

  describe("opening an incoming call notification", () => {
    afterEach(() => {
      window.history.replaceState(null, "", "/");
    });

    it("should take the call from the address once the student session is known", async () => {
      vi.mocked(studentAuthApi.getProfile).mockResolvedValue({
        id: "s1",
        email: "student@test.com",
        name: "Student",
        isEmailVerified: true,
        tutor: null,
      });
      window.history.replaceState(null, "", "/student/cabinet/schedule?call=c-7");
      const scope = fork();

      await allSettled(studentUserModel.getCurrentStudentFx, { scope });

      expect(scope.getState(callNotificationOpenModel.$pendingNotificationCallId)).toBe("c-7");
      expect(window.location.search).toBe("");
    });

    it("should hand the call the service worker posts to the call feature", async () => {
      const scope = fork();

      await allSettled(serviceWorkerMessaged, {
        scope,
        params: { type: "call_notification_opened", callId: "c-9" },
      });

      expect(scope.getState(callNotificationOpenModel.$pendingNotificationCallId)).toBe("c-9");
    });
  });
});
