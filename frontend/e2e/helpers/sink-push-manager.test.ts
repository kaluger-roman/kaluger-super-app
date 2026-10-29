import { describe, expect, it, vi } from "vitest";

import { fakeSinkPushManager } from "./sink-push-manager";

const options = {
  endpoint: "http://localhost:3001/api/__test__/push-sink/student-1",
  storageKey: "e2eSinkPushKeys",
  permissionKey: "e2eSinkPushPermission",
};

const BASE64URL = /^[A-Za-z0-9_-]+$/;

// A page load: fresh browser APIs, the same localStorage.
const loadPage = (): void => {
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal(
    "Notification",
    class {
      static permission = "default";
      static requestPermission = async () => "denied";
    }
  );
  fakeSinkPushManager(options);
};

const pushManager = (): PushManager => new PushManager();

describe("fakeSinkPushManager", () => {
  it("should grant the permission the student allows and keep it over a reload", async () => {
    loadPage();
    expect(Notification.permission).toBe("default");

    await expect(Notification.requestPermission()).resolves.toBe("granted");
    loadPage();

    expect(Notification.permission).toBe("granted");
  });

  it("should subscribe to the sink with a P-256 key and an auth secret in base64url without padding", async () => {
    loadPage();

    const { endpoint, keys } = (await pushManager().subscribe()).toJSON();

    expect(endpoint).toBe(options.endpoint);
    expect(keys?.p256dh).toMatch(BASE64URL);
    expect(keys?.auth).toMatch(BASE64URL);
    const publicKey = Buffer.from(keys?.p256dh ?? "", "base64url");
    expect(publicKey).toHaveLength(65);
    expect(publicKey[0]).toBe(0x04);
    expect(Buffer.from(keys?.auth ?? "", "base64url")).toHaveLength(16);
    await expect(
      crypto.subtle.importKey("raw", publicKey, { name: "ECDH", namedCurve: "P-256" }, true, [])
    ).resolves.toBeDefined();
  });

  it("should give the same subscription back after a reload", async () => {
    loadPage();
    const subscribed = (await pushManager().subscribe()).toJSON();

    loadPage();

    expect((await pushManager().getSubscription())?.toJSON()).toEqual(subscribed);
    expect((await pushManager().subscribe()).toJSON()).toEqual(subscribed);
  });

  it("should have no subscription before subscribing and none after unsubscribing", async () => {
    loadPage();
    await expect(pushManager().getSubscription()).resolves.toBeNull();
    const subscription = await pushManager().subscribe();

    await expect(subscription.unsubscribe()).resolves.toBe(true);
    loadPage();

    await expect(pushManager().getSubscription()).resolves.toBeNull();
  });
});
