import { allSettled, createWatch, fork } from "effector";
import type { Scope } from "effector";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { notificationsModel, studentUserModel, userModel } from "@entities";
import { showNotification } from "@shared";
import type { User } from "@shared";

import { server } from "../../../../__tests__/mocks/server";
import { DISABLE_FAILED_TEXT, ENABLE_FAILED_TEXT } from "../callNotifications.constants";
import * as callNotificationsModel from "../callNotifications.model";

const ENDPOINT = "https://push.example.com/device-1";
const TUTOR = { id: "tutor-1", name: "Анна", email: "anna@example.com" } as User;
const VAPID_KEY = "BOk";

type FakeSubscription = {
  endpoint: string;
  toJSON: () => PushSubscriptionJSON;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const fakeSubscription = (endpoint = ENDPOINT): FakeSubscription => ({
  endpoint,
  toJSON: () => ({ endpoint, keys: { p256dh: "p", auth: "a" } }),
  unsubscribe: vi.fn().mockResolvedValue(true),
});

const fakeRegistration = (existing: FakeSubscription | null) => {
  const created = fakeSubscription("https://push.example.com/created");
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(existing),
    subscribe: vi.fn().mockResolvedValue(created),
  };
  return {
    registration: { pushManager } as unknown as ServiceWorkerRegistration,
    pushManager,
    created,
  };
};

const stubPushBrowser = (permission: NotificationPermission, answer = permission) => {
  vi.stubGlobal("PushManager", class {});
  const requestPermission = vi.fn().mockResolvedValue(answer);
  vi.stubGlobal("Notification", { permission, requestPermission });
  Object.defineProperty(navigator, "serviceWorker", { value: {}, configurable: true });
  return requestPermission;
};

const scopeWith = (registration: ServiceWorkerRegistration | null): Scope =>
  fork({
    values: [
      [notificationsModel.$vapidKey, VAPID_KEY],
      [callNotificationsModel.$isVapidKeyLoaded, true],
      [notificationsModel.$serviceWorkerRegistration, registration],
    ],
  });

const openCabinet = (scope: Scope) =>
  allSettled(callNotificationsModel.CabinetGate.open, { scope, params: {} });

const recordStudentPush = () => {
  const subscribed: unknown[] = [];
  const unsubscribed: unknown[] = [];
  server.use(
    http.post("*/api/student-push/subscribe", async ({ request }) => {
      subscribed.push(await request.json());
      return HttpResponse.json(
        { id: "s1", endpoint: ENDPOINT, deviceName: null, createdAt: "" },
        { status: 201 }
      );
    }),
    http.delete("*/api/student-push/unsubscribe", async ({ request }) => {
      unsubscribed.push(await request.json());
      return HttpResponse.json({ message: "Подписка удалена" });
    })
  );
  return { subscribed, unsubscribed };
};

const watchToasts = (scope: Scope) => {
  const toasts: string[] = [];
  createWatch({ unit: showNotification, fn: ({ message }) => toasts.push(message), scope });
  return toasts;
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.restoreAllMocks();
});

describe("features/callNotifications/model/callNotifications.model", () => {
  describe("status", () => {
    it("should stay unknown until the cabinet reads the device", () => {
      const scope = scopeWith(null);

      expect(scope.getState(callNotificationsModel.$status)).toBeNull();
    });

    it("should offer notifications on a browser with push and no subscription", async () => {
      stubPushBrowser("default");
      const scope = scopeWith(null);

      await openCabinet(scope);

      expect(scope.getState(callNotificationsModel.$status)).toBe("off");
    });

    it("should hide notifications when the server has no push keys", async () => {
      stubPushBrowser("default");
      server.use(
        http.get("*/api/push/vapid-key", () =>
          HttpResponse.json({ vapidPublicKey: null, configured: false })
        )
      );
      const scope = fork({ values: [[notificationsModel.$serviceWorkerRegistration, null]] });

      await openCabinet(scope);
      expect(scope.getState(callNotificationsModel.$status)).toBeNull();
      await allSettled(notificationsModel.loadVapidKeyFx, { scope });

      expect(scope.getState(callNotificationsModel.$status)).toBe("unsupported");
    });

    it("should report a permission refused earlier", async () => {
      stubPushBrowser("denied");
      const scope = scopeWith(null);

      await openCabinet(scope);

      expect(scope.getState(callNotificationsModel.$status)).toBe("denied");
    });
  });

  describe("syncing the device on entering the cabinet", () => {
    it("should send the browser subscription to the server again and show it as on", async () => {
      stubPushBrowser("granted");
      const requests = recordStudentPush();
      const { registration } = fakeRegistration(fakeSubscription());
      const scope = scopeWith(registration);

      await openCabinet(scope);

      expect(requests.subscribed).toEqual([
        { subscription: { endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" } } },
      ]);
      expect(scope.getState(callNotificationsModel.$status)).toBe("on");
    });

    it("should take the device over from a tutor signed out by this student's login (FR-024)", async () => {
      stubPushBrowser("granted");
      const requests = recordStudentPush();
      const { registration, pushManager } = fakeRegistration(fakeSubscription());
      const scope = fork({
        values: [
          [userModel.$user, TUTOR],
          [notificationsModel.$vapidKey, VAPID_KEY],
          [callNotificationsModel.$isVapidKeyLoaded, true],
          [notificationsModel.$serviceWorkerRegistration, registration],
        ],
      });

      await allSettled(userModel.tutorSessionCleared, { scope });
      await openCabinet(scope);

      expect(requests.subscribed).toEqual([
        { subscription: { endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" } } },
      ]);
      expect(pushManager.subscribe).not.toHaveBeenCalled();
      expect(scope.getState(callNotificationsModel.$status)).toBe("on");
    });

    it("should not send anything for a browser without a subscription", async () => {
      stubPushBrowser("granted");
      const requests = recordStudentPush();
      const { registration } = fakeRegistration(null);
      const scope = scopeWith(registration);

      await openCabinet(scope);

      expect(requests.subscribed).toEqual([]);
      expect(scope.getState(callNotificationsModel.$status)).toBe("off");
    });

    it("should sync once the service worker registers after the cabinet opened", async () => {
      stubPushBrowser("granted");
      const requests = recordStudentPush();
      const { registration } = fakeRegistration(fakeSubscription());
      const scope = scopeWith(null);
      await openCabinet(scope);

      await allSettled(notificationsModel.serviceWorkerRegistered, {
        scope,
        params: registration,
      });

      expect(requests.subscribed).toHaveLength(1);
      expect(scope.getState(callNotificationsModel.$status)).toBe("on");
    });

    it("should show notifications as off when the server refuses the device", async () => {
      stubPushBrowser("granted");
      server.use(
        http.post("*/api/student-push/subscribe", () =>
          HttpResponse.json({ error: "Подписка принадлежит другому пользователю" }, { status: 403 })
        )
      );
      const { registration } = fakeRegistration(fakeSubscription());
      const scope = scopeWith(registration);

      await openCabinet(scope);

      expect(scope.getState(callNotificationsModel.$status)).toBe("off");
    });
  });

  describe("enabling", () => {
    it("should ask for permission, subscribe the device and send it to the server", async () => {
      const requestPermission = stubPushBrowser("default", "granted");
      const requests = recordStudentPush();
      const { registration, pushManager } = fakeRegistration(null);
      const scope = scopeWith(registration);
      await openCabinet(scope);

      await allSettled(callNotificationsModel.enableClicked, { scope });

      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      });
      expect(requests.subscribed).toEqual([
        {
          subscription: {
            endpoint: "https://push.example.com/created",
            keys: { p256dh: "p", auth: "a" },
          },
        },
      ]);
      expect(scope.getState(callNotificationsModel.$status)).toBe("on");
    });

    it("should reuse a subscription the browser already has", async () => {
      stubPushBrowser("default", "granted");
      const requests = recordStudentPush();
      const { registration, pushManager } = fakeRegistration(fakeSubscription());
      const scope = scopeWith(registration);

      await allSettled(callNotificationsModel.enableClicked, { scope });

      expect(pushManager.subscribe).not.toHaveBeenCalled();
      expect(requests.subscribed).toHaveLength(1);
    });

    it("should show the refusal without subscribing when the student denies", async () => {
      stubPushBrowser("default", "denied");
      const requests = recordStudentPush();
      const { registration, pushManager } = fakeRegistration(null);
      const scope = scopeWith(registration);
      await openCabinet(scope);

      await allSettled(callNotificationsModel.enableClicked, { scope });

      expect(pushManager.subscribe).not.toHaveBeenCalled();
      expect(requests.subscribed).toEqual([]);
      expect(scope.getState(callNotificationsModel.$status)).toBe("denied");
    });

    it("should report a failed request and keep notifications off", async () => {
      stubPushBrowser("default", "granted");
      server.use(
        http.post("*/api/student-push/subscribe", () =>
          HttpResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
        )
      );
      const { registration } = fakeRegistration(null);
      const scope = scopeWith(registration);
      await openCabinet(scope);
      const toasts = watchToasts(scope);

      await allSettled(callNotificationsModel.enableClicked, { scope });

      expect(toasts).toEqual([ENABLE_FAILED_TEXT]);
      expect(scope.getState(callNotificationsModel.$status)).toBe("off");
    });

    it("should do nothing before the service worker is registered", async () => {
      const requestPermission = stubPushBrowser("default", "granted");
      const scope = scopeWith(null);

      await allSettled(callNotificationsModel.enableClicked, { scope });

      expect(requestPermission).not.toHaveBeenCalled();
    });
  });

  describe("the settings switch", () => {
    const enabledScope = async (subscription: FakeSubscription) => {
      stubPushBrowser("granted");
      const { registration } = fakeRegistration(subscription);
      const scope = scopeWith(registration);
      await openCabinet(scope);
      return scope;
    };

    it("should remove the device from the server and the browser when turned off", async () => {
      const requests = recordStudentPush();
      const subscription = fakeSubscription();
      const scope = await enabledScope(subscription);

      await allSettled(callNotificationsModel.toggled, { scope });

      expect(requests.unsubscribed).toEqual([{ endpoint: ENDPOINT }]);
      expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
      expect(scope.getState(callNotificationsModel.$status)).toBe("off");
    });

    it("should still turn off a device the server already forgot", async () => {
      recordStudentPush();
      server.use(
        http.delete("*/api/student-push/unsubscribe", () =>
          HttpResponse.json({ error: "Подписка не найдена" }, { status: 404 })
        )
      );
      const subscription = fakeSubscription();
      const scope = await enabledScope(subscription);

      await allSettled(callNotificationsModel.toggled, { scope });

      expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
      expect(scope.getState(callNotificationsModel.$status)).toBe("off");
    });

    it("should keep notifications on and report when the server is unreachable", async () => {
      recordStudentPush();
      server.use(
        http.delete("*/api/student-push/unsubscribe", () =>
          HttpResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
        )
      );
      const subscription = fakeSubscription();
      const scope = await enabledScope(subscription);
      const toasts = watchToasts(scope);

      await allSettled(callNotificationsModel.toggled, { scope });

      expect(subscription.unsubscribe).not.toHaveBeenCalled();
      expect(toasts).toEqual([DISABLE_FAILED_TEXT]);
      expect(scope.getState(callNotificationsModel.$status)).toBe("on");
    });

    it("should enable notifications when switched on", async () => {
      stubPushBrowser("default", "granted");
      const requests = recordStudentPush();
      const { registration } = fakeRegistration(null);
      const scope = scopeWith(registration);
      await openCabinet(scope);

      await allSettled(callNotificationsModel.toggled, { scope });

      expect(requests.subscribed).toHaveLength(1);
      expect(scope.getState(callNotificationsModel.$status)).toBe("on");
    });

    it("should not ask again after a refusal", async () => {
      const requestPermission = stubPushBrowser("denied");
      const { registration } = fakeRegistration(null);
      const scope = scopeWith(registration);
      await openCabinet(scope);

      await allSettled(callNotificationsModel.toggled, { scope });

      expect(requestPermission).not.toHaveBeenCalled();
    });
  });

  describe("the invite card", () => {
    it("should stay hidden until the device's choice is read", () => {
      expect(scopeWith(null).getState(callNotificationsModel.$isInviteDismissed)).toBe(true);
    });

    it("should show the invite on a device that never closed it", async () => {
      const scope = scopeWith(null);

      await openCabinet(scope);

      expect(scope.getState(callNotificationsModel.$isInviteDismissed)).toBe(false);
    });

    it("should remember a closed invite on the device", async () => {
      const first = scopeWith(null);
      await openCabinet(first);
      await allSettled(callNotificationsModel.inviteDismissed, { scope: first });

      const next = scopeWith(null);
      await openCabinet(next);

      expect(first.getState(callNotificationsModel.$isInviteDismissed)).toBe(true);
      expect(next.getState(callNotificationsModel.$isInviteDismissed)).toBe(true);
    });
  });

  describe("the install instruction", () => {
    const iphoneSafariScope = (inviteDismissed = false) =>
      fork({
        values: [
          [notificationsModel.$vapidKey, VAPID_KEY],
          [callNotificationsModel.$isVapidKeyLoaded, true],
          [
            callNotificationsModel.$environment,
            { isIos: true, standalone: false, pushSupported: false, permission: "default" },
          ],
          [callNotificationsModel.$isInviteDismissed, inviteDismissed],
        ],
      });

    it("should be on screen while the invite card shows it", async () => {
      const scope = iphoneSafariScope();

      await allSettled(callNotificationsModel.InviteCardGate.open, { scope, params: {} });

      expect(scope.getState(callNotificationsModel.$isInstallInstructionShown)).toBe(true);
    });

    it("should leave the screen once the student closes the invite card", async () => {
      const scope = iphoneSafariScope();
      await allSettled(callNotificationsModel.InviteCardGate.open, { scope, params: {} });

      await allSettled(callNotificationsModel.inviteDismissed, { scope });

      expect(scope.getState(callNotificationsModel.$isInstallInstructionShown)).toBe(false);
    });

    it("should be on screen in the settings section after the invite was closed", async () => {
      const scope = iphoneSafariScope(true);

      await allSettled(callNotificationsModel.SettingsSectionGate.open, { scope, params: {} });

      expect(scope.getState(callNotificationsModel.$isInstallInstructionShown)).toBe(true);
    });

    it("should not be on screen outside the cabinet pages", () => {
      expect(iphoneSafariScope().getState(callNotificationsModel.$isInstallInstructionShown)).toBe(
        false
      );
    });

    it("should not be on screen where the device needs no install", async () => {
      stubPushBrowser("default");
      const scope = scopeWith(null);
      await openCabinet(scope);

      await allSettled(callNotificationsModel.InviteCardGate.open, { scope, params: {} });

      expect(scope.getState(callNotificationsModel.$status)).toBe("off");
      expect(scope.getState(callNotificationsModel.$isInstallInstructionShown)).toBe(false);
    });
  });

  it("should forget the device subscription when the student logs out", async () => {
    const scope = fork({
      values: [[callNotificationsModel.$isSubscribed, true]],
      handlers: [[studentUserModel.studentLogoutFx, () => undefined]],
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await allSettled(studentUserModel.studentLoggedOut, { scope });

    expect(scope.getState(callNotificationsModel.$isSubscribed)).toBe(false);
  });
});
