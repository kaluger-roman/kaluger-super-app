import { allSettled, createWatch, fork } from "effector";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { showNotification } from "@shared";

import { server } from "../../../__tests__/mocks/server";
import * as notificationsModel from "../notifications.model";
import type { PushPermissionState, ReminderSettings } from "../notifications.types";
import "../index";

const REGISTRATION = {} as ServiceWorkerRegistration;

type Device = {
  remindersOn: boolean;
  callsOn: boolean;
  subscribed: boolean;
  permission?: PushPermissionState;
};

const recordUpdates = () => {
  const updates: Partial<ReminderSettings>[] = [];
  server.use(
    http.put("*/api/reminder-settings", async ({ request }) => {
      const body = (await request.json()) as Partial<ReminderSettings>;
      updates.push(body);
      return HttpResponse.json({
        enabled: false,
        intervals: [],
        muteWhenInLesson: false,
        callNotificationsEnabled: true,
        ...body,
      });
    })
  );
  return updates;
};

const deviceScope = ({ remindersOn, callsOn, subscribed, permission = "default" }: Device) => {
  const subscribe = vi.fn();
  const unsubscribe = vi.fn();
  const scope = fork({
    values: [
      [
        notificationsModel.$reminderSettings,
        {
          enabled: remindersOn,
          intervals: remindersOn ? [30] : [],
          muteWhenInLesson: false,
          callNotificationsEnabled: callsOn,
        },
      ],
      [notificationsModel.$isPushSubscribed, subscribed],
      [notificationsModel.$isPushSupported, true],
      [notificationsModel.$vapidKey, "vapid-key"],
      [notificationsModel.$serviceWorkerRegistration, REGISTRATION],
      [notificationsModel.$pushPermission, permission],
    ],
    handlers: [
      [notificationsModel.subscribePushFx, subscribe],
      [notificationsModel.unsubscribePushFx, unsubscribe],
    ],
  });
  return { scope, subscribe, unsubscribe };
};

describe("entities/notifications/callNotificationsToggle.model", () => {
  it("should have call notifications on until the server says otherwise", async () => {
    const scope = fork();
    server.use(
      http.get("*/api/reminder-settings", () =>
        HttpResponse.json({
          enabled: true,
          intervals: [30],
          muteWhenInLesson: false,
          callNotificationsEnabled: false,
        })
      )
    );

    expect(scope.getState(notificationsModel.$callNotificationsEnabled)).toBe(true);
    await allSettled(notificationsModel.loadSettings, { scope });

    expect(scope.getState(notificationsModel.$callNotificationsEnabled)).toBe(false);
  });

  describe("turning call notifications off", () => {
    it("should keep the device subscribed while reminders are on", async () => {
      const updates = recordUpdates();
      const { scope, unsubscribe } = deviceScope({
        remindersOn: true,
        callsOn: true,
        subscribed: true,
      });

      await allSettled(notificationsModel.callNotificationsToggled, { scope });

      expect(unsubscribe).not.toHaveBeenCalled();
      expect(updates).toEqual([{ callNotificationsEnabled: false }]);
      expect(scope.getState(notificationsModel.$callNotificationsEnabled)).toBe(false);
    });

    it("should unsubscribe the device when reminders are off too", async () => {
      const updates = recordUpdates();
      const { scope, unsubscribe } = deviceScope({
        remindersOn: false,
        callsOn: true,
        subscribed: true,
      });

      await allSettled(notificationsModel.callNotificationsToggled, { scope });

      expect(unsubscribe).toHaveBeenCalledWith(REGISTRATION);
      expect(updates).toEqual([{ enabled: false, callNotificationsEnabled: false }]);
      expect(scope.getState(notificationsModel.$isPushSubscribed)).toBe(false);
    });
  });

  describe("turning call notifications on", () => {
    it("should only update the server for a subscribed device", async () => {
      const updates = recordUpdates();
      const { scope, subscribe } = deviceScope({
        remindersOn: true,
        callsOn: false,
        subscribed: true,
      });

      await allSettled(notificationsModel.callNotificationsToggled, { scope });

      expect(subscribe).not.toHaveBeenCalled();
      expect(updates).toEqual([{ callNotificationsEnabled: true }]);
    });

    it("should subscribe an unsubscribed device first", async () => {
      const updates = recordUpdates();
      const { scope, subscribe } = deviceScope({
        remindersOn: false,
        callsOn: false,
        subscribed: false,
      });

      await allSettled(notificationsModel.callNotificationsToggled, { scope });

      expect(subscribe).toHaveBeenCalledWith({
        vapidKey: "vapid-key",
        registration: REGISTRATION,
      });
      expect(updates).toEqual([{ callNotificationsEnabled: true }]);
      expect(scope.getState(notificationsModel.$callNotificationsEnabled)).toBe(true);
      expect(scope.getState(notificationsModel.$reminderSettings).enabled).toBe(false);
    });

    it("should show calls off on a device without a subscription even with the setting on", () => {
      const { scope } = deviceScope({ remindersOn: false, callsOn: true, subscribed: false });

      expect(scope.getState(notificationsModel.$callNotificationsEnabled)).toBe(true);
      expect(scope.getState(notificationsModel.$isCallNotificationsOn)).toBe(false);
    });

    it("should subscribe a device without a subscription in one tap and keep the setting on", async () => {
      const updates = recordUpdates();
      const { scope, subscribe, unsubscribe } = deviceScope({
        remindersOn: false,
        callsOn: true,
        subscribed: false,
      });

      await allSettled(notificationsModel.callNotificationsToggled, { scope });

      expect(subscribe).toHaveBeenCalledWith({
        vapidKey: "vapid-key",
        registration: REGISTRATION,
      });
      expect(unsubscribe).not.toHaveBeenCalled();
      expect(updates).toEqual([]);
      expect(scope.getState(notificationsModel.$callNotificationsEnabled)).toBe(true);
      expect(scope.getState(notificationsModel.$isCallNotificationsOn)).toBe(true);
    });

    it("should show the account setting where the device cannot hold a subscription", () => {
      const scope = fork({
        values: [
          [notificationsModel.$isPushSupported, true],
          [notificationsModel.$vapidKey, "vapid-key"],
          [notificationsModel.$serviceWorkerRegistration, null],
        ],
      });

      expect(scope.getState(notificationsModel.$isCallNotificationsOn)).toBe(true);
    });

    it("should not turn calls on when reminders subscribed the device", async () => {
      const updates = recordUpdates();
      const { scope } = deviceScope({ remindersOn: false, callsOn: false, subscribed: false });

      await allSettled(notificationsModel.remindersToggled, { scope });

      expect(updates).toEqual([{ enabled: true }]);
    });

    it("should leave the setting off when the device could not subscribe", async () => {
      const updates = recordUpdates();
      const { scope, subscribe } = deviceScope({
        remindersOn: false,
        callsOn: false,
        subscribed: false,
      });
      subscribe.mockImplementationOnce(() => {
        throw new Error("Разрешение на уведомления не предоставлено");
      });

      await allSettled(notificationsModel.callNotificationsToggled, { scope });
      await allSettled(notificationsModel.subscribePushFx, {
        scope,
        params: { vapidKey: "vapid-key", registration: REGISTRATION },
      });

      expect(updates).toEqual([]);
      expect(scope.getState(notificationsModel.$callNotificationsEnabled)).toBe(false);
    });
  });

  describe("with notifications denied by the browser", () => {
    it.each([
      { callsOn: false, subscribed: false },
      { callsOn: true, subscribed: false },
      { callsOn: true, subscribed: true },
    ])(
      "should leave the device and the setting as they are on a tap without a toast (regression): %o",
      async ({ callsOn, subscribed }) => {
        const updates = recordUpdates();
        const { scope, subscribe, unsubscribe } = deviceScope({
          remindersOn: false,
          callsOn,
          subscribed,
          permission: "denied",
        });
        const toasts = vi.fn();
        createWatch({ unit: showNotification, fn: toasts, scope });

        await allSettled(notificationsModel.callNotificationsToggled, { scope });

        expect(subscribe).not.toHaveBeenCalled();
        expect(unsubscribe).not.toHaveBeenCalled();
        expect(updates).toEqual([]);
        expect(toasts).not.toHaveBeenCalled();
        expect(scope.getState(notificationsModel.$callNotificationsEnabled)).toBe(callsOn);
      }
    );

    it("should subscribe in one tap again once the browser allows notifications", async () => {
      const { scope, subscribe } = deviceScope({
        remindersOn: false,
        callsOn: true,
        subscribed: false,
        permission: "denied",
      });
      vi.stubGlobal("Notification", { permission: "granted" });

      await allSettled(notificationsModel.readPushPermissionFx, { scope });
      await allSettled(notificationsModel.callNotificationsToggled, { scope });

      expect(subscribe).toHaveBeenCalledWith({
        vapidKey: "vapid-key",
        registration: REGISTRATION,
      });
    });
  });

  describe("turning reminders off", () => {
    it("should keep the device subscribed for calls", async () => {
      const updates = recordUpdates();
      const { scope, unsubscribe } = deviceScope({
        remindersOn: true,
        callsOn: true,
        subscribed: true,
      });

      await allSettled(notificationsModel.remindersToggled, { scope });

      expect(unsubscribe).not.toHaveBeenCalled();
      expect(updates).toEqual([{ enabled: false }]);
    });

    it("should unsubscribe the device when calls are off too", async () => {
      const updates = recordUpdates();
      const { scope, unsubscribe } = deviceScope({
        remindersOn: true,
        callsOn: false,
        subscribed: true,
      });

      await allSettled(notificationsModel.remindersToggled, { scope });

      expect(unsubscribe).toHaveBeenCalledWith(REGISTRATION);
      expect(updates).toEqual([{ enabled: false, callNotificationsEnabled: false }]);
    });
  });
});
