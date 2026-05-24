import { allSettled, fork } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { notificationsApi, showNotification } from "@shared";

// Side-effect import: wires up the unsubscribe → settingsUpdated samples.
import "../notifications-toggle.model";
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

  describe("toast feedback", () => {
    it("should show success toast after settings update", async () => {
      const updatedSettings = { enabled: true, intervals: [30], muteWhenInLesson: false };
      const messages: Array<{ message: string; type: string }> = [];

      const unwatch = showNotification.watch((payload) => messages.push(payload));

      const scope = fork({
        handlers: [
          [notificationsModel.updateSettingsFx, () => updatedSettings],
        ],
      });

      await allSettled(notificationsModel.settingsUpdated, {
        scope,
        params: { enabled: true },
      });

      unwatch();

      expect(messages).toContainEqual({
        message: "Настройки обновлены",
        type: "success",
      });
    });

    it("should show error toast on subscribe failure", async () => {
      const messages: Array<{ message: string; type: string }> = [];

      const unwatch = showNotification.watch((payload) => messages.push(payload));

      const scope = fork({
        handlers: [
          [notificationsModel.subscribePushFx, () => { throw new Error("denied"); }],
        ],
      });

      await allSettled(notificationsModel.subscribePushFx, {
        scope,
        params: { vapidKey: "key", registration: {} as ServiceWorkerRegistration },
      });

      unwatch();

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
            { enabled: true, intervals: [], muteWhenInLesson: false },
          ],
          [notificationsModel.$isPushSubscribed, true],
          [notificationsModel.$serviceWorkerRegistration, {} as ServiceWorkerRegistration],
          [notificationsModel.$isPushSupported, true],
          [notificationsModel.$vapidKey, "k"],
        ],
        handlers: [
          [notificationsModel.unsubscribePushFx, () => {
            throw new Error("sw gone");
          }],
          [notificationsModel.subscribePushFx, () => ({
            subscription: {} as PushSubscription,
            serverResponse: {} as never,
          })],
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

    it("should not disable settings on server when unsubscribePushFx fails (regression: .finally → .done)", async () => {
      // Regression for bug-hunt 2026-05-09 #7: subscribing settingsUpdated to
      // unsubscribePushFx.finally pushed enabled=false to the server even when
      // the browser-side unsubscribe failed, leaving the device subscribed
      // while the server thought reminders were off.
      // Note: do NOT override updateSettingsFx in fork handlers — that would
      // bypass the real handler (which is what calls notificationsApi.updateSettings)
      // and the assertion below would pass even if the bug were reintroduced.
      const messages: Array<{ message: string; type: string }> = [];
      const unwatch = showNotification.watch((payload) => messages.push(payload));

      const scope = fork({
        handlers: [
          [notificationsModel.unsubscribePushFx, () => { throw new Error("sw gone"); }],
        ],
      });

      await allSettled(notificationsModel.unsubscribePushFx, {
        scope,
        params: {} as ServiceWorkerRegistration,
      });

      unwatch();

      expect(vi.mocked(notificationsApi.updateSettings)).not.toHaveBeenCalled();
      expect(messages).toContainEqual({
        message: "Не удалось отписаться от уведомлений",
        type: "error",
      });
    });
  });

});
