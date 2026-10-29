import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_REMINDER_SETTINGS } from "../notifications.constants";
import {
  removeDevice,
  shouldAutoSubscribe,
  subscribeDevice,
  syncDevice,
  toSubscribeRequest,
  toVapidKey,
} from "../notifications.helpers";
import type { AutoSubscribeState } from "../notifications.types";

const ENDPOINT = "https://push.example.com/1";
const VAPID_KEY = "BOk";

const fakeSubscription = (endpoint = ENDPOINT, unsubscribe = vi.fn().mockResolvedValue(true)) =>
  ({
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: "p", auth: "a" } }),
    unsubscribe,
  }) as unknown as PushSubscription;

const fakeRegistration = (existing: PushSubscription | null) => {
  const created = fakeSubscription("https://push.example.com/created");
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(existing),
    subscribe: vi.fn().mockResolvedValue(created),
  };
  return { registration: { pushManager } as unknown as ServiceWorkerRegistration, pushManager };
};

const stubPermission = (answer: NotificationPermission) => {
  const requestPermission = vi.fn().mockResolvedValue(answer);
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  return requestPermission;
};

const autoSubscribeState = (overrides: Partial<AutoSubscribeState> = {}): AutoSubscribeState => ({
  attempted: false,
  isTutorSession: true,
  settingsLoaded: true,
  settings: { ...DEFAULT_REMINDER_SETTINGS, enabled: true },
  subscribed: false,
  permission: "default",
  vapidKey: VAPID_KEY,
  reg: {} as ServiceWorkerRegistration,
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toSubscribeRequest", () => {
  it("should send the endpoint and the keys of the browser subscription", () => {
    expect(toSubscribeRequest(fakeSubscription())).toEqual({
      subscription: { endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" } },
    });
  });
});

describe("subscribeDevice", () => {
  it("should send the browser's existing subscription without creating a new one", async () => {
    stubPermission("granted");
    const { registration, pushManager } = fakeRegistration(fakeSubscription());
    const send = vi.fn().mockResolvedValue(undefined);

    await expect(subscribeDevice({ registration, vapidKey: VAPID_KEY }, send)).resolves.toBe(
      "granted"
    );

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({
      subscription: { endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" } },
    });
  });

  it("should create a subscription with the server key when the browser has none", async () => {
    stubPermission("granted");
    const { registration, pushManager } = fakeRegistration(null);
    const send = vi.fn().mockResolvedValue(undefined);

    await subscribeDevice({ registration, vapidKey: VAPID_KEY }, send);

    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
    expect(send).toHaveBeenCalledWith({
      subscription: {
        endpoint: "https://push.example.com/created",
        keys: { p256dh: "p", auth: "a" },
      },
    });
  });

  it("should neither subscribe nor send anything without the permission", async () => {
    stubPermission("denied");
    const { registration, pushManager } = fakeRegistration(null);
    const send = vi.fn();

    await expect(subscribeDevice({ registration, vapidKey: VAPID_KEY }, send)).resolves.toBe(
      "denied"
    );

    expect(pushManager.getSubscription).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("should fail when the server refuses the subscription", async () => {
    stubPermission("granted");
    const { registration } = fakeRegistration(fakeSubscription());
    const send = vi.fn().mockRejectedValue(new Error("403"));

    await expect(subscribeDevice({ registration, vapidKey: VAPID_KEY }, send)).rejects.toThrow(
      "403"
    );
  });
});

describe("syncDevice", () => {
  it("should send the subscription the browser holds again", async () => {
    const { registration } = fakeRegistration(fakeSubscription());
    const send = vi.fn().mockResolvedValue(undefined);

    await expect(syncDevice(registration, send)).resolves.toBe(true);

    expect(send).toHaveBeenCalledWith({
      subscription: { endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" } },
    });
  });

  it("should send nothing for a browser without a subscription", async () => {
    const { registration, pushManager } = fakeRegistration(null);
    const send = vi.fn();

    await expect(syncDevice(registration, send)).resolves.toBe(false);

    expect(send).not.toHaveBeenCalled();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("should fail when the server refuses the subscription", async () => {
    const { registration } = fakeRegistration(fakeSubscription());

    await expect(
      syncDevice(registration, vi.fn().mockRejectedValue(new Error("403")))
    ).rejects.toThrow("403");
  });
});

describe("removeDevice", () => {
  it("should drop the subscription on the server, then in the browser", async () => {
    const order: string[] = [];
    const browserUnsubscribe = vi.fn(async () => {
      order.push("browser");
      return true;
    });
    const { registration } = fakeRegistration(fakeSubscription(ENDPOINT, browserUnsubscribe));
    const unsubscribe = vi.fn(async (endpoint: string) => {
      order.push(`server ${endpoint}`);
    });

    await removeDevice(registration, unsubscribe);

    expect(order).toEqual([`server ${ENDPOINT}`, "browser"]);
  });

  it("should do nothing for a browser without a subscription", async () => {
    const { registration } = fakeRegistration(null);
    const unsubscribe = vi.fn();

    await removeDevice(registration, unsubscribe);

    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("should keep the browser subscription and fail on a server error by default", async () => {
    const browserUnsubscribe = vi.fn().mockResolvedValue(true);
    const { registration } = fakeRegistration(fakeSubscription(ENDPOINT, browserUnsubscribe));

    await expect(
      removeDevice(registration, vi.fn().mockRejectedValue(new Error("500")))
    ).rejects.toThrow("500");

    expect(browserUnsubscribe).not.toHaveBeenCalled();
  });

  it("should drop the browser subscription after a server error the caller ignores", async () => {
    const browserUnsubscribe = vi.fn().mockResolvedValue(true);
    const { registration } = fakeRegistration(fakeSubscription(ENDPOINT, browserUnsubscribe));
    const notFound = new Error("404");
    const isIgnorable = vi.fn((error: unknown) => error === notFound);

    await removeDevice(registration, vi.fn().mockRejectedValue(notFound), isIgnorable);

    expect(isIgnorable).toHaveBeenCalledWith(notFound);
    expect(browserUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("shouldAutoSubscribe", () => {
  it("should subscribe for reminders even if that asks for the permission", () => {
    expect(shouldAutoSubscribe(autoSubscribeState())).toBe(true);
  });

  it("should subscribe for calls alone only where notifications are already allowed", () => {
    const callsOnly = { ...DEFAULT_REMINDER_SETTINGS, enabled: false };

    expect(shouldAutoSubscribe(autoSubscribeState({ settings: callsOnly }))).toBe(false);
    expect(
      shouldAutoSubscribe(autoSubscribeState({ settings: callsOnly, permission: "granted" }))
    ).toBe(true);
  });

  it.each<[string, Partial<AutoSubscribeState>]>([
    ["already tried in this session", { attempted: true }],
    ["outside a tutor session", { isTutorSession: false }],
    ["before the tutor's settings arrived", { settingsLoaded: false }],
    ["on a subscribed device", { subscribed: true }],
    ["without the server key", { vapidKey: null }],
    ["without a service worker", { reg: null }],
    [
      "with reminders and calls off",
      {
        settings: { ...DEFAULT_REMINDER_SETTINGS, callNotificationsEnabled: false },
        permission: "granted",
      },
    ],
  ])("should not subscribe %s", (_case, overrides) => {
    expect(shouldAutoSubscribe(autoSubscribeState(overrides))).toBe(false);
  });
});

describe("toVapidKey", () => {
  it("should give the key the server reports as configured", () => {
    expect(toVapidKey({ vapidPublicKey: VAPID_KEY, configured: true })).toBe(VAPID_KEY);
  });

  it("should give no key when the server reports push as not configured", () => {
    expect(toVapidKey({ vapidPublicKey: "", configured: false })).toBeNull();
    expect(toVapidKey({ vapidPublicKey: null, configured: false })).toBeNull();
    expect(toVapidKey({ vapidPublicKey: VAPID_KEY, configured: false })).toBeNull();
  });

  it("should give no key for an empty one", () => {
    expect(toVapidKey({ vapidPublicKey: "", configured: true })).toBeNull();
  });
});
