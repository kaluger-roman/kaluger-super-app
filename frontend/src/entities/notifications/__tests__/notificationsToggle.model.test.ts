import { allSettled, fork } from "effector";
import { describe, expect, it, vi } from "vitest";

import { userModel } from "@entities/user";
import type { User } from "@shared";

import { DEFAULT_REMINDER_SETTINGS } from "../notifications.constants";
import * as notificationsModel from "../notifications.model";
import type { PushPermissionState, ReminderSettings } from "../notifications.types";
import "../index";

const REGISTRATION = {} as ServiceWorkerRegistration;
const TUTOR = { id: "tutor-1", name: "Анна", email: "anna@example.com" } as User;

type Device = {
  settings: Pick<ReminderSettings, "enabled" | "callNotificationsEnabled">;
  permission?: PushPermissionState;
  subscribed?: boolean;
};

const tutorDevice = ({ settings, permission = "granted", subscribed = false }: Device) => {
  const subscribe = vi.fn();
  const sync = vi.fn().mockResolvedValue(true);
  const scope = fork({
    values: [
      [userModel.$user, TUTOR],
      [notificationsModel.$pushPermission, permission],
      [notificationsModel.$isPushSubscribed, subscribed],
      [notificationsModel.$vapidKey, "vapid-key"],
      [notificationsModel.$serviceWorkerRegistration, REGISTRATION],
    ],
    handlers: [
      [notificationsModel.loadSettingsFx, () => ({ ...DEFAULT_REMINDER_SETTINGS, ...settings })],
      [notificationsModel.subscribePushFx, subscribe],
      [notificationsModel.checkPushSubscriptionFx, () => false],
      [notificationsModel.syncSubscriptionFx, sync],
    ],
  });
  return { scope, subscribe, sync };
};

describe("entities/notifications/notificationsToggle.model", () => {
  describe("subscribing the device on start", () => {
    it("should bring back the subscription for calls when reminders are off", async () => {
      const { scope, subscribe } = tutorDevice({
        settings: { enabled: false, callNotificationsEnabled: true },
      });

      await allSettled(notificationsModel.loadSettings, { scope });

      expect(subscribe).toHaveBeenCalledWith({ vapidKey: "vapid-key", registration: REGISTRATION });
    });

    it("should not ask for permission on start for calls alone", async () => {
      const { scope, subscribe } = tutorDevice({
        settings: { enabled: false, callNotificationsEnabled: true },
        permission: "default",
      });

      await allSettled(notificationsModel.loadSettings, { scope });

      expect(subscribe).not.toHaveBeenCalled();
    });

    it("should leave the device alone when reminders and calls are both off", async () => {
      const { scope, subscribe } = tutorDevice({
        settings: { enabled: false, callNotificationsEnabled: false },
      });

      await allSettled(notificationsModel.loadSettings, { scope });

      expect(subscribe).not.toHaveBeenCalled();
    });

    it("should wait for the tutor's settings instead of acting on the defaults", async () => {
      const { scope, subscribe } = tutorDevice({
        settings: { enabled: false, callNotificationsEnabled: false },
      });

      await allSettled(notificationsModel.checkPushSubscriptionFx, { scope, params: REGISTRATION });

      expect(subscribe).not.toHaveBeenCalled();
    });
  });

  describe("binding a subscription the browser already holds to this tutor", () => {
    it("should send it again once the tutor's settings are known (regression: another account's subscription)", async () => {
      const { scope, subscribe, sync } = tutorDevice({
        settings: { enabled: false, callNotificationsEnabled: true },
        subscribed: true,
      });

      await allSettled(notificationsModel.loadSettings, { scope });

      expect(sync).toHaveBeenCalledTimes(1);
      expect(sync).toHaveBeenCalledWith(REGISTRATION);
      expect(subscribe).not.toHaveBeenCalled();
      expect(scope.getState(notificationsModel.$isPushSubscribed)).toBe(true);
    });

    it("should send it once per tutor session", async () => {
      const { scope, sync } = tutorDevice({
        settings: { enabled: true, callNotificationsEnabled: false },
        subscribed: true,
      });

      await allSettled(notificationsModel.loadSettings, { scope });
      await allSettled(notificationsModel.loadSettings, { scope });
      await allSettled(notificationsModel.checkPushSubscriptionFx, { scope, params: REGISTRATION });

      expect(sync).toHaveBeenCalledTimes(1);
    });

    it.each<[string, Device]>([
      [
        "reminders and calls are both off",
        { settings: { enabled: false, callNotificationsEnabled: false }, subscribed: true },
      ],
      [
        "the permission is not granted",
        {
          settings: { enabled: true, callNotificationsEnabled: true },
          subscribed: true,
          permission: "default",
        },
      ],
      [
        "the browser holds no subscription",
        { settings: { enabled: false, callNotificationsEnabled: true } },
      ],
    ])("should leave it alone when %s", async (_case, device) => {
      const { scope, sync } = tutorDevice(device);

      await allSettled(notificationsModel.loadSettings, { scope });

      expect(sync).not.toHaveBeenCalled();
    });

    it("should wait for the tutor's settings instead of acting on the defaults", async () => {
      const { scope, sync } = tutorDevice({
        settings: { enabled: true, callNotificationsEnabled: true },
      });

      await allSettled(notificationsModel.checkPushSubscriptionFx, { scope, params: REGISTRATION });

      expect(sync).not.toHaveBeenCalled();
    });

    it("should show the device as not subscribed when the server refused it", async () => {
      const { scope, sync } = tutorDevice({
        settings: { enabled: false, callNotificationsEnabled: true },
        subscribed: true,
      });
      sync.mockRejectedValue(new Error("403"));

      await allSettled(notificationsModel.loadSettings, { scope });

      expect(scope.getState(notificationsModel.$isPushSubscribed)).toBe(false);
    });

    it("should send it again for the next tutor signed in on the tab", async () => {
      const { scope, sync } = tutorDevice({
        settings: { enabled: true, callNotificationsEnabled: true },
        subscribed: true,
      });
      await allSettled(notificationsModel.loadSettings, { scope });

      await allSettled(userModel.tutorSessionCleared, { scope });
      await allSettled(userModel.$user, { scope, params: TUTOR });
      await allSettled(notificationsModel.$isPushSubscribed, { scope, params: true });
      await allSettled(notificationsModel.loadSettings, { scope });

      expect(sync).toHaveBeenCalledTimes(2);
    });
  });

  describe.each([
    ["logs out", userModel.logoutUser],
    ["is signed out by a student login", userModel.tutorSessionCleared],
  ] as const)("when the tutor %s", (_case, sessionEnded) => {
    it("should not subscribe the next session's device through the tutor API", async () => {
      const { scope, subscribe } = tutorDevice({
        settings: { enabled: true, callNotificationsEnabled: true },
        subscribed: true,
      });
      await allSettled(notificationsModel.loadSettings, { scope });

      await allSettled(sessionEnded, { scope });
      await allSettled(notificationsModel.checkPushSubscriptionFx, { scope, params: REGISTRATION });

      expect(subscribe).not.toHaveBeenCalled();
    });

    it("should forget the tutor's settings and subscription state", async () => {
      const { scope } = tutorDevice({
        settings: { enabled: true, callNotificationsEnabled: false },
        subscribed: true,
      });
      await allSettled(notificationsModel.loadSettings, { scope });

      await allSettled(sessionEnded, { scope });

      expect(scope.getState(notificationsModel.$reminderSettings)).toEqual(
        DEFAULT_REMINDER_SETTINGS
      );
      expect(scope.getState(notificationsModel.$isPushSubscribed)).toBe(false);
    });
  });
});
