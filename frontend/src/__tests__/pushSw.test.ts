import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import { beforeEach, describe, expect, it, vi } from "vitest";

const SOURCE = readFileSync(join(__dirname, "../../public/push-sw.js"), "utf8");

type Listener = (event: unknown) => void;
type FakeNotification = { tag: string; close: ReturnType<typeof vi.fn> };
type FakeWindow = {
  focus: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
};

const createWindow = (): FakeWindow => {
  const appWindow: FakeWindow = {
    focus: vi.fn(async () => appWindow),
    navigate: vi.fn(async () => appWindow),
    postMessage: vi.fn(),
  };
  return appWindow;
};

// The service worker runs in its own global scope: it is loaded into a VM context with a fake
// `self`, the way the browser would load it.
const loadServiceWorker = () => {
  const listeners = new Map<string, Listener>();
  const shown: FakeNotification[] = [];
  const windows: FakeWindow[] = [];
  const registration = {
    showNotification: vi.fn(async (_title: string, options: { tag: string }) => {
      shown.push({ tag: options.tag, close: vi.fn() });
    }),
    getNotifications: vi.fn(async ({ tag }: { tag: string }) =>
      shown.filter((notification) => notification.tag === tag)
    ),
  };
  const clients = {
    matchAll: vi.fn(async () => windows),
    openWindow: vi.fn(async () => null),
    claim: vi.fn(),
  };
  const self = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    registration,
    clients,
    skipWaiting: vi.fn(),
  };
  runInNewContext(SOURCE, { self, console, caches: {}, fetch: vi.fn() });

  const dispatch = async (type: string, event: object): Promise<void> => {
    const pending: Promise<unknown>[] = [];
    listeners.get(type)?.({
      ...event,
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    });
    await Promise.all(pending);
  };

  const push = (payload: unknown) => dispatch("push", { data: { json: () => payload } });

  const click = (data: unknown) => {
    const notification = { data, close: vi.fn() };
    return dispatch("notificationclick", { notification }).then(() => notification);
  };

  return { registration, clients, shown, windows, dispatch, push, click };
};

const callPush = (type: "incoming_call" | "missed_call" | "call_closed", url: string) => ({
  title: "Входящий видеозвонок",
  body: "Анна Петрова",
  tag: "call-c-1",
  data: { type, callId: "c-1", url },
});

let sw: ReturnType<typeof loadServiceWorker>;

beforeEach(() => {
  sw = loadServiceWorker();
});

describe("push-sw.js — showing pushes", () => {
  it("should ring for an incoming call until it is answered", async () => {
    await sw.push(callPush("incoming_call", "/student/cabinet/schedule?call=c-1"));

    expect(sw.registration.showNotification).toHaveBeenCalledWith(
      "Входящий видеозвонок",
      expect.objectContaining({
        body: "Анна Петрова",
        tag: "call-c-1",
        requireInteraction: true,
        renotify: true,
        vibrate: [300, 200, 300, 200, 300],
        data: expect.objectContaining({ type: "incoming_call", callId: "c-1" }),
      })
    );
  });

  it("should put the missed call in place of the incoming one, quietly", async () => {
    await sw.push(callPush("missed_call", "/student/cabinet/calls"));

    expect(sw.registration.showNotification).toHaveBeenCalledWith(
      "Входящий видеозвонок",
      expect.objectContaining({ tag: "call-c-1", renotify: false })
    );
    expect(sw.shown[0].close).not.toHaveBeenCalled();
  });

  it("should show a call answered elsewhere and close every notification of that call", async () => {
    await sw.push(callPush("incoming_call", "/dashboard?call=c-1"));

    await sw.push(callPush("call_closed", "/dashboard"));

    expect(sw.registration.showNotification).toHaveBeenCalledTimes(2);
    expect(sw.registration.getNotifications).toHaveBeenCalledWith({ tag: "call-c-1" });
    sw.shown.forEach((notification) => expect(notification.close).toHaveBeenCalled());
  });

  it("should keep showing lesson reminders as before", async () => {
    await sw.push({
      title: "Урок через 30 минут",
      body: "Математика",
      tag: "lesson-reminder-1-30",
      data: { type: "lesson_reminder", lessonId: "l-1", url: "/lessons" },
    });

    expect(sw.registration.showNotification).toHaveBeenCalledWith(
      "Урок через 30 минут",
      expect.objectContaining({
        tag: "lesson-reminder-1-30",
        requireInteraction: true,
        vibrate: [200, 100, 200],
      })
    );
  });

  it("should ignore a push without data", async () => {
    await sw.dispatch("push", { data: null });

    expect(sw.registration.showNotification).not.toHaveBeenCalled();
  });
});

describe("push-sw.js — opening notifications", () => {
  it("should hand an incoming call to the open app without reloading it", async () => {
    const appWindow = createWindow();
    sw.windows.push(appWindow);

    const notification = await sw.click(callPush("incoming_call", "/dashboard?call=c-1").data);

    expect(notification.close).toHaveBeenCalled();
    expect(appWindow.focus).toHaveBeenCalled();
    expect(appWindow.postMessage).toHaveBeenCalledWith({
      type: "call_notification_opened",
      callId: "c-1",
    });
    expect(appWindow.navigate).not.toHaveBeenCalled();
    expect(sw.clients.openWindow).not.toHaveBeenCalled();
  });

  it("should open the app on the incoming call when no window is open", async () => {
    await sw.click(callPush("incoming_call", "/student/cabinet/schedule?call=c-1").data);

    expect(sw.clients.openWindow).toHaveBeenCalledWith("/student/cabinet/schedule?call=c-1");
  });

  it("should take a missed call to the call history in the open app", async () => {
    const appWindow = createWindow();
    sw.windows.push(appWindow);

    await sw.click(callPush("missed_call", "/call/history").data);

    expect(appWindow.navigate).toHaveBeenCalledWith("/call/history");
    expect(appWindow.postMessage).not.toHaveBeenCalled();
  });

  it("should keep opening lesson reminders on the lessons page", async () => {
    await sw.click({ type: "lesson_reminder", lessonId: "l-1", url: "/lessons" });
    await sw.click(undefined);

    expect(sw.clients.openWindow.mock.calls).toEqual([["/lessons"], ["/lessons"]]);
  });
});
