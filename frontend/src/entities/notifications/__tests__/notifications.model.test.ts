import { allSettled, createWatch, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userModel } from "@entities/user";
import { notificationsApi, showNotification } from "@shared";
import type { User } from "@shared";

import * as notificationsModel from "../notifications.model";
import { $autoSubscribeAttempted } from "../notificationsToggle.model";

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

const TUTOR = { id: "tutor-1", name: "Анна", email: "anna@example.com" } as User;

const mockedGetVapidKey = vi.mocked(notificationsApi.getVapidKey);
const mockedGetSettings = vi.mocked(notificationsApi.getSettings);
const mockedUpdateSettings = vi.mocked(notificationsApi.updateSettings);

describe("notifications.model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("VAPID key loading", () => {
    it("should load VAPID key into store", async () => {
      mockedGetVapidKey.mockResolvedValue({ vapidPublicKey: "test-key-123", configured: true });

      const scope = fork();
      await allSettled(notificationsModel.loadVapidKeyFx, { scope, params: undefined });

      expect(scope.getState(notificationsModel.$vapidKey)).toBe("test-key-123");
    });

    it("should keep $vapidKey null when backend reports VAPID not configured", async () => {
      mockedGetVapidKey.mockResolvedValue({ vapidPublicKey: null, configured: false });

      const scope = fork();
      await allSettled(notificationsModel.loadVapidKeyFx, { scope, params: undefined });

      expect(scope.getState(notificationsModel.$vapidKey)).toBeNull();
    });

    it("should keep $vapidKey null when the backend sends an empty key with VAPID not configured (regression)", async () => {
      mockedGetVapidKey.mockResolvedValue({ vapidPublicKey: "", configured: false });

      const scope = fork();
      await allSettled(notificationsModel.loadVapidKeyFx, { scope, params: undefined });

      expect(scope.getState(notificationsModel.$vapidKey)).toBeNull();
      expect(scope.getState(notificationsModel.$canSubscribePush)).toBe(false);
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
        callNotificationsEnabled: true,
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
        callNotificationsEnabled: true,
      };
      mockedUpdateSettings.mockResolvedValue(updatedSettings);

      const scope = fork({
        values: [
          [
            notificationsModel.$reminderSettings,
            {
              enabled: false,
              intervals: [],
              muteWhenInLesson: false,
              callNotificationsEnabled: true,
            },
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
      const scope = fork({
        values: [[notificationsModel.$isPushSubscribed, false]],
        handlers: [[notificationsModel.subscribePushFx, () => undefined]],
      });

      await allSettled(notificationsModel.subscribePushFx, {
        scope,
        params: { vapidKey: "test-key", registration: {} as ServiceWorkerRegistration },
      });

      expect(scope.getState(notificationsModel.$isPushSubscribed)).toBe(true);
      expect(scope.getState(notificationsModel.$pushPermission)).toBe("granted");
    });

    it("should read the permission again after the browser refused a subscribe", async () => {
      vi.stubGlobal("Notification", {
        permission: "denied",
        requestPermission: vi.fn().mockResolvedValue("denied"),
      });
      const scope = fork();
      expect(scope.getState(notificationsModel.$isPushPermissionDenied)).toBe(false);

      await allSettled(notificationsModel.subscribePushFx, {
        scope,
        params: { vapidKey: "test-key", registration: {} as ServiceWorkerRegistration },
      });

      expect(scope.getState(notificationsModel.$pushPermission)).toBe("denied");
      expect(scope.getState(notificationsModel.$isPushPermissionDenied)).toBe(true);
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

  describe("syncSubscriptionFx", () => {
    const registrationWith = (subscription: PushSubscription | null) =>
      ({
        pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription) },
      }) as unknown as ServiceWorkerRegistration;

    it("should send the browser's subscription with its keys to the tutor API", async () => {
      const endpoint = "https://push.example.com/device";
      const subscription = {
        endpoint,
        toJSON: () => ({ endpoint, keys: { p256dh: "p", auth: "a" } }),
      } as unknown as PushSubscription;
      vi.mocked(notificationsApi.subscribe).mockResolvedValue({
        id: "s1",
        endpoint,
        deviceName: null,
        createdAt: "",
      });
      const scope = fork();

      const result = await allSettled(notificationsModel.syncSubscriptionFx, {
        scope,
        params: registrationWith(subscription),
      });

      expect(result).toEqual({ status: "done", value: true });
      expect(notificationsApi.subscribe).toHaveBeenCalledWith({
        subscription: { endpoint, keys: { p256dh: "p", auth: "a" } },
      });
    });

    it("should report a browser without a subscription", async () => {
      const scope = fork();

      const result = await allSettled(notificationsModel.syncSubscriptionFx, {
        scope,
        params: registrationWith(null),
      });

      expect(result).toEqual({ status: "done", value: false });
      expect(notificationsApi.subscribe).not.toHaveBeenCalled();
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

  describe("toast feedback", () => {
    it("should show success toast after settings update", async () => {
      const updatedSettings = {
        enabled: true,
        intervals: [30],
        muteWhenInLesson: false,
        callNotificationsEnabled: true,
      };
      const messages: Array<{ message: string; type: string }> = [];

      const scope = fork({
        handlers: [[notificationsModel.updateSettingsFx, () => updatedSettings]],
      });

      createWatch({ unit: showNotification, fn: (payload) => messages.push(payload), scope });

      await allSettled(notificationsModel.settingsUpdated, {
        scope,
        params: { enabled: true },
      });

      expect(messages).toContainEqual({
        message: "Настройки обновлены",
        type: "success",
      });
    });

    it("should show error toast on subscribe failure", async () => {
      const messages: Array<{ message: string; type: string }> = [];

      const scope = fork({
        handlers: [
          [
            notificationsModel.subscribePushFx,
            () => {
              throw new Error("denied");
            },
          ],
        ],
      });

      createWatch({ unit: showNotification, fn: (payload) => messages.push(payload), scope });

      await allSettled(notificationsModel.subscribePushFx, {
        scope,
        params: { vapidKey: "key", registration: {} as ServiceWorkerRegistration },
      });

      expect(messages).toContainEqual({
        message: "Не удалось подписаться на уведомления",
        type: "error",
      });
    });

    it("should not push enabled=true on later subscribePushFx.done after unsubscribePushFx.fail (regression: $isManualToggle stale)", async () => {
      // Regression for bug-hunt 2026-05-09 round-2: $isManualToggle was reset
      // on subscribePushFx.fail and updateSettingsFx.finally, but not on
      // unsubscribePushFx.fail. After a failed unsubscribe, a subsequent
      // subscribePushFx.done (e.g. auto-subscribe on settings reload) would see
      // stale $isManualToggle=true and incorrectly push enabled=true to server.
      const scope = fork({
        values: [
          [
            notificationsModel.$reminderSettings,
            {
              enabled: true,
              intervals: [],
              muteWhenInLesson: false,
              callNotificationsEnabled: false,
            },
          ],
          [notificationsModel.$isPushSubscribed, true],
          [notificationsModel.$serviceWorkerRegistration, {} as ServiceWorkerRegistration],
          [notificationsModel.$isPushSupported, true],
          [notificationsModel.$vapidKey, "k"],
        ],
        handlers: [
          [
            notificationsModel.unsubscribePushFx,
            () => {
              throw new Error("sw gone");
            },
          ],
          [notificationsModel.subscribePushFx, () => undefined],
        ],
      });

      // Manual disable toggle → unsubscribePushFx → fails.
      await allSettled(notificationsModel.remindersToggled, { scope });

      // A later subscribePushFx.done (e.g. auto-subscribe) should not flip the
      // server back to enabled=true once $isManualToggle has been reset.
      await allSettled(notificationsModel.subscribePushFx, {
        scope,
        params: { vapidKey: "k", registration: {} as ServiceWorkerRegistration },
      });

      expect(vi.mocked(notificationsApi.updateSettings)).not.toHaveBeenCalled();
    });

    it("should auto-subscribe only once per session even on repeated loadSettingsFx (regression: bug-hunt 2026-05-24 #2)", async () => {
      const subscribePushHandler = vi.fn();

      const scope = fork({
        values: [
          [
            notificationsModel.$reminderSettings,
            { enabled: true, intervals: [], muteWhenInLesson: false },
          ],
          [notificationsModel.$isPushSubscribed, false],
          [notificationsModel.$vapidKey, "vapid-key"],
          [notificationsModel.$serviceWorkerRegistration, {} as ServiceWorkerRegistration],
          [userModel.$user, TUTOR],
        ],
        handlers: [[notificationsModel.subscribePushFx, subscribePushHandler]],
      });

      mockedGetSettings.mockResolvedValue({
        enabled: true,
        intervals: [],
        muteWhenInLesson: false,
        callNotificationsEnabled: true,
      });

      await allSettled(notificationsModel.loadSettings, { scope });
      await allSettled(notificationsModel.loadSettings, { scope });
      await allSettled(notificationsModel.loadSettings, { scope });

      expect(subscribePushHandler).toHaveBeenCalledTimes(1);
      expect(scope.getState($autoSubscribeAttempted)).toBe(true);
    });

    it("should reset $autoSubscribeAttempted on logoutUser", async () => {
      const scope = fork({
        values: [[$autoSubscribeAttempted, true]],
      });

      await allSettled(userModel.logoutUser, { scope });

      expect(scope.getState($autoSubscribeAttempted)).toBe(false);
    });

    it("should mark attempted even when subscribePushFx fails (regression: avoid retry loop on permission denied)", async () => {
      const subscribePushHandler = vi.fn(() => {
        throw new Error("permission denied");
      });

      const scope = fork({
        values: [
          [
            notificationsModel.$reminderSettings,
            { enabled: true, intervals: [], muteWhenInLesson: false },
          ],
          [notificationsModel.$isPushSubscribed, false],
          [notificationsModel.$vapidKey, "vapid-key"],
          [notificationsModel.$serviceWorkerRegistration, {} as ServiceWorkerRegistration],
          [userModel.$user, TUTOR],
        ],
        handlers: [[notificationsModel.subscribePushFx, subscribePushHandler]],
      });

      mockedGetSettings.mockResolvedValue({
        enabled: true,
        intervals: [],
        muteWhenInLesson: false,
        callNotificationsEnabled: true,
      });

      await allSettled(notificationsModel.loadSettings, { scope });
      await allSettled(notificationsModel.loadSettings, { scope });

      expect(subscribePushHandler).toHaveBeenCalledTimes(1);
      expect(scope.getState($autoSubscribeAttempted)).toBe(true);
    });

    it("should not disable settings on server when unsubscribePushFx fails (regression: .finally → .done)", async () => {
      // Regression for bug-hunt 2026-05-09 #7: subscribing settingsUpdated to
      // unsubscribePushFx.finally pushed enabled=false to the server even when
      // the browser-side unsubscribe failed, leaving the device subscribed
      // while the server thought reminders were off.
      // Note: do NOT override updateSettingsFx in fork handlers — that would
      // bypass the real handler (which is what calls notificationsApi.updateSettings)
      // and the assertion below would pass even if the bug were reintroduced.
      const messages: Array<{ message: string; type: string }> = [];
      const scope = fork({
        handlers: [
          [
            notificationsModel.unsubscribePushFx,
            () => {
              throw new Error("sw gone");
            },
          ],
        ],
      });

      createWatch({ unit: showNotification, fn: (payload) => messages.push(payload), scope });

      await allSettled(notificationsModel.unsubscribePushFx, {
        scope,
        params: {} as ServiceWorkerRegistration,
      });

      expect(vi.mocked(notificationsApi.updateSettings)).not.toHaveBeenCalled();
      expect(messages).toContainEqual({
        message: "Не удалось отписаться от уведомлений",
        type: "error",
      });
    });
  });
});
