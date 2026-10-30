import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificationsModel } from "@entities";

import * as callNotificationOpenModel from "../callNotificationOpen.model";
import * as devicePushModel from "../devicePush.model";
import { callModel } from "../index";
import type { CallRole, CallSignalingInbound, CallSnapshot } from "../signaling.types";
import { setWebRtcAdapter } from "../webrtc.helpers";
import { installTransport, resetCallFlow, settleMicrotasks } from "./callFlow";
import { createFakeAdapter } from "./fakeWebrtc";

const ENDPOINT = "https://push.example.com/own-device";

const RINGING_SNAPSHOT: CallSnapshot = {
  callId: "in-1",
  status: "ringing",
  direction: "incoming",
  peerName: "Анна",
  lesson: null,
  iceServers: [],
  peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
  connectedAt: null,
};

type FakeRegistration = {
  pushManager: { getSubscription: ReturnType<typeof vi.fn> };
  getNotifications: ReturnType<typeof vi.fn>;
};

const createRegistration = (
  getSubscription: () => Promise<{ endpoint: string } | null>,
  notifications: { close: () => void }[] = []
): FakeRegistration => ({
  pushManager: { getSubscription: vi.fn(getSubscription) },
  getNotifications: vi.fn(async () => notifications),
});

const subscribedRegistration = (notifications: { close: () => void }[] = []) =>
  createRegistration(async () => ({ endpoint: ENDPOINT }), notifications);

const asRegistration = (fake: FakeRegistration) => fake as unknown as ServiceWorkerRegistration;

const withRegistration = (fake: FakeRegistration | null): Scope =>
  fork({
    values: [[notificationsModel.$serviceWorkerRegistration, fake ? asRegistration(fake) : null]],
  });

const ring = (scope: Scope, role: CallRole = "student") =>
  allSettled(callModel.incomingCallReceived, {
    scope,
    params: { callId: "in-1", callerName: "Анна", role, lesson: null },
  });

describe("features/videoCall/model/devicePush.model", () => {
  let sent: CallSignalingInbound[];

  const answers = () => sent.filter(({ type }) => type === "call_accept" || type === "call_reject");

  beforeEach(() => {
    sent = installTransport();
    setWebRtcAdapter(createFakeAdapter());
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  it.each(["student", "tutor"] as const)(
    "should name this device in the %s's answer once its push endpoint is known",
    async (role) => {
      const scope = withRegistration(subscribedRegistration());
      await ring(scope, role);

      await allSettled(callModel.acceptCall, { scope });

      expect(answers()).toEqual([{ type: "call_accept", callId: "in-1", pushEndpoint: ENDPOINT }]);
    }
  );

  it("should name this device when it declines the call", async () => {
    const scope = withRegistration(subscribedRegistration());
    await ring(scope);

    await allSettled(callModel.rejectCall, { scope });

    expect(answers()).toEqual([{ type: "call_reject", callId: "in-1", pushEndpoint: ENDPOINT }]);
  });

  it("should answer without an endpoint when the device has no push subscription", async () => {
    const scope = withRegistration(createRegistration(async () => null));
    await ring(scope);

    await allSettled(callModel.acceptCall, { scope });

    expect(answers()).toEqual([{ type: "call_accept", callId: "in-1" }]);
  });

  it("should answer without an endpoint where the browser has no service worker", async () => {
    const scope = withRegistration(null);
    await ring(scope);

    await allSettled(callModel.rejectCall, { scope });

    expect(answers()).toEqual([{ type: "call_reject", callId: "in-1" }]);
  });

  it("should answer without an endpoint when the subscription cannot be read", async () => {
    const scope = withRegistration(
      createRegistration(async () => {
        throw new Error("push is not available");
      })
    );
    await ring(scope);

    await allSettled(callModel.acceptCall, { scope });

    expect(answers()).toEqual([{ type: "call_accept", callId: "in-1" }]);
  });

  it("should not hold the answer back while the endpoint is still being read", async () => {
    let resolveSubscription: (value: { endpoint: string }) => void = () => undefined;
    const scope = withRegistration(
      createRegistration(
        () =>
          new Promise((resolve) => {
            resolveSubscription = resolve;
          })
      )
    );
    const ringing = ring(scope);
    await settleMicrotasks();

    const accepting = allSettled(callModel.acceptCall, { scope });
    await settleMicrotasks();

    expect(answers()).toEqual([{ type: "call_accept", callId: "in-1" }]);
    resolveSubscription({ endpoint: ENDPOINT });
    await Promise.all([ringing, accepting]);
  });

  it("should read the endpoint of a service worker registered while the call rings", async () => {
    const scope = withRegistration(null);
    await ring(scope);

    await allSettled(notificationsModel.serviceWorkerRegistered, {
      scope,
      params: asRegistration(subscribedRegistration()),
    });
    await allSettled(callModel.acceptCall, { scope });

    expect(answers()).toEqual([{ type: "call_accept", callId: "in-1", pushEndpoint: ENDPOINT }]);
  });

  it("should not read the push subscription while no call rings", async () => {
    const registration = subscribedRegistration();
    const scope = fork();

    await allSettled(notificationsModel.serviceWorkerRegistered, {
      scope,
      params: asRegistration(registration),
    });

    // Only the notifications model's own subscription check reads it.
    expect(registration.pushManager.getSubscription).toHaveBeenCalledTimes(1);
  });

  it("should close this device's notification of the call it answered", async () => {
    const notification = { close: vi.fn() };
    const registration = subscribedRegistration([notification]);
    const scope = withRegistration(registration);
    await ring(scope);

    await allSettled(callModel.acceptCall, { scope });

    expect(registration.getNotifications).toHaveBeenCalledWith({ tag: "call-in-1" });
    expect(notification.close).toHaveBeenCalledTimes(1);
  });

  it("should close this device's notification of the call it declined", async () => {
    const notification = { close: vi.fn() };
    const registration = subscribedRegistration([notification]);
    const scope = withRegistration(registration);
    await ring(scope);

    await allSettled(callModel.rejectCall, { scope });

    expect(registration.getNotifications).toHaveBeenCalledWith({ tag: "call-in-1" });
    expect(notification.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["answered", callModel.acceptCall],
    ["declined", callModel.rejectCall],
  ] as const)(
    "should close an incoming notification shown after the call was %s here (regression)",
    async (_, answer) => {
      const late = { close: vi.fn() };
      const registration = subscribedRegistration();
      const scope = withRegistration(registration);
      await ring(scope);
      await allSettled(answer, { scope });
      registration.getNotifications.mockResolvedValue([late]);

      await allSettled(callNotificationOpenModel.serviceWorkerMessageReceived, {
        scope,
        params: { type: "call_notification_shown", callId: "in-1" },
      });

      expect(registration.getNotifications).toHaveBeenLastCalledWith({ tag: "call-in-1" });
      expect(late.close).toHaveBeenCalledTimes(1);
    }
  );

  it("should leave an incoming notification of a call not answered here alone", async () => {
    const registration = subscribedRegistration();
    const scope = withRegistration(registration);
    await ring(scope);

    await allSettled(callNotificationOpenModel.serviceWorkerMessageReceived, {
      scope,
      params: { type: "call_notification_shown", callId: "in-1" },
    });

    expect(registration.getNotifications).not.toHaveBeenCalled();
  });

  it("should read the endpoint of a call restored after a reload", async () => {
    const scope = withRegistration(subscribedRegistration());

    await allSettled(callModel.callRestored, {
      scope,
      params: { role: "student", snapshot: RINGING_SNAPSHOT, elapsedSeconds: 0 },
    });

    expect(scope.getState(devicePushModel.$pushEndpoint)).toBe(ENDPOINT);
  });

  it("should leave the notifications alone when the call ends elsewhere", async () => {
    const registration = subscribedRegistration([{ close: vi.fn() }]);
    const scope = withRegistration(registration);
    await ring(scope);

    await allSettled(callModel.callEnded, { scope, params: "hangup" });

    expect(registration.getNotifications).not.toHaveBeenCalled();
  });
});
