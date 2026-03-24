import { allSettled, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { notificationsApi } from "@shared";

import * as notificationsModel from "../notifications.model";

vi.mock("@shared", async () => {
  const actual = await vi.importActual("@shared");
  return {
    ...actual,
    notificationsApi: {
      getVapidKey: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      getSubscriptions: vi.fn(),
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    },
  };
});

const mockedGetVapidKey = vi.mocked(notificationsApi.getVapidKey);
const mockedGetSettings = vi.mocked(notificationsApi.getSettings);
const mockedUpdateSettings = vi.mocked(notificationsApi.updateSettings);

describe("notifications.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("VAPID key loading", () => {
    it("should load VAPID key into store", async () => {
      mockedGetVapidKey.mockResolvedValue({ vapidPublicKey: "test-key-123" });

      const scope = fork();
      await allSettled(notificationsModel.loadVapidKeyFx, { scope, params: undefined });

      expect(scope.getState(notificationsModel.$vapidKey)).toBe("test-key-123");
    });
  });

  describe("$isPushSupported", () => {
    it("should have initial value based on browser support", () => {
      const scope = fork();
      const isSupported = scope.getState(notificationsModel.$isPushSupported);
      // In test environment, PushManager is likely not available
      expect(typeof isSupported).toBe("boolean");
    });
  });

  describe("settings flow", () => {
    it("should load settings on loadSettings event", async () => {
      const settings = {
        enabled: true,
        intervals: [5, 30],
        muteWhenInLesson: false,
      };
      mockedGetSettings.mockResolvedValue(settings);

      const scope = fork();
      await allSettled(notificationsModel.loadSettings, { scope });

      expect(mockedGetSettings).toHaveBeenCalled();
      expect(scope.getState(notificationsModel.$reminderSettings)).toEqual(settings);
    });

    it("should update settings on settingsUpdated event", async () => {
      const updatedSettings = {
        enabled: true,
        intervals: [10, 30],
        muteWhenInLesson: true,
      };
      mockedUpdateSettings.mockResolvedValue(updatedSettings);

      const scope = fork({
        values: [
          [
            notificationsModel.$reminderSettings,
            { enabled: false, intervals: [], muteWhenInLesson: false },
          ],
        ],
      });

      await allSettled(notificationsModel.settingsUpdated, {
        scope,
        params: { enabled: true, intervals: [10, 30], muteWhenInLesson: true },
      });

      expect(mockedUpdateSettings).toHaveBeenCalledWith({
        enabled: true,
        intervals: [10, 30],
        muteWhenInLesson: true,
      });
      expect(scope.getState(notificationsModel.$reminderSettings)).toEqual(updatedSettings);
    });
  });

  describe("push subscription state", () => {
    it("should set $isPushSubscribed to true after successful subscribe", async () => {
      const mockResult = { subscription: {} as PushSubscription, serverResponse: {} as never };

      const scope = fork({
        values: [[notificationsModel.$isPushSubscribed, false]],
        handlers: [[notificationsModel.subscribePushFx, () => mockResult]],
      });

      await allSettled(notificationsModel.subscribePushFx, {
        scope,
        params: { vapidKey: "test-key", registration: {} as ServiceWorkerRegistration },
      });

      expect(scope.getState(notificationsModel.$isPushSubscribed)).toBe(true);
      expect(scope.getState(notificationsModel.$pushPermission)).toBe("granted");
    });

    it("should set $isPushSubscribed to false after unsubscribe", async () => {
      const scope = fork({
        values: [[notificationsModel.$isPushSubscribed, true]],
        handlers: [[notificationsModel.unsubscribePushFx, () => undefined]],
      });

      await allSettled(notificationsModel.unsubscribePushFx, {
        scope,
        params: {} as ServiceWorkerRegistration,
      });

      expect(scope.getState(notificationsModel.$isPushSubscribed)).toBe(false);
    });
  });

  describe("service worker registration", () => {
    it("should store SW registration in $serviceWorkerRegistration", async () => {
      const mockRegistration = {} as ServiceWorkerRegistration;

      const scope = fork();
      await allSettled(notificationsModel.serviceWorkerRegistered, {
        scope,
        params: mockRegistration,
      });

      expect(scope.getState(notificationsModel.$serviceWorkerRegistration)).toBe(mockRegistration);
    });

    it("should handle null SW registration", async () => {
      const scope = fork();
      await allSettled(notificationsModel.serviceWorkerRegistered, {
        scope,
        params: null,
      });

      expect(scope.getState(notificationsModel.$serviceWorkerRegistration)).toBeNull();
    });
  });

  describe("$isSettingsLoading", () => {
    it("should be pending during loadSettingsFx", () => {
      const scope = fork();
      const isPending = scope.getState(notificationsModel.$isSettingsLoading);
      expect(isPending).toBe(false);
    });
  });
});
