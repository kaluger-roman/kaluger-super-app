import { describe, expect, it, vi } from "vitest";

import { toAcceptSignal, toRejectSignal } from "../call.helpers";
import type { TerminatedCall } from "../call.types";
import {
  closeCallNotifications,
  isCallId,
  isCallNotificationsTarget,
  isRegistration,
  readPushEndpoint,
  readShownCallId,
  toAnsweredNotifications,
  toIncomingRegistration,
  toLateNotifications,
  toRejectedCallId,
} from "../devicePush.helpers";

const ENDPOINT = "https://push.example.com/own-device";

const registrationWith = (
  getSubscription: () => Promise<{ endpoint: string } | null>,
  notifications: { close: () => void }[] = []
) =>
  ({
    pushManager: { getSubscription: vi.fn(getSubscription) },
    getNotifications: vi.fn(async () => notifications),
  }) as unknown as ServiceWorkerRegistration;

const registration = registrationWith(async () => null);
const address = { callId: "in-1", role: "student" as const };

describe("features/videoCall/model devicePush.helpers", () => {
  describe("readPushEndpoint", () => {
    it("should read the endpoint of the device's push subscription", async () => {
      await expect(
        readPushEndpoint(registrationWith(async () => ({ endpoint: ENDPOINT })))
      ).resolves.toBe(ENDPOINT);
    });

    it("should give null without a subscription or when it cannot be read", async () => {
      await expect(readPushEndpoint(registrationWith(async () => null))).resolves.toBeNull();
      await expect(
        readPushEndpoint(
          registrationWith(async () => {
            throw new Error("push is not available");
          })
        )
      ).resolves.toBeNull();
    });
  });

  describe("isRegistration", () => {
    it("should tell a registration from none", () => {
      expect(isRegistration(registration)).toBe(true);
      expect(isRegistration(null)).toBe(false);
    });
  });

  describe("toIncomingRegistration", () => {
    it("should keep the registration only while a call rings", () => {
      expect(toIncomingRegistration("incoming", registration)).toBe(registration);
      expect(toIncomingRegistration("active", registration)).toBeNull();
      expect(toIncomingRegistration("idle", registration)).toBeNull();
      expect(toIncomingRegistration("incoming", null)).toBeNull();
    });
  });

  describe("toAnsweredNotifications", () => {
    it("should target the notifications of the current call", () => {
      expect(toAnsweredNotifications({ registration, callId: "in-1" })).toEqual({
        registration,
        callId: "in-1",
      });
    });

    it("should target nothing without a registration or a call", () => {
      expect(toAnsweredNotifications({ registration: null, callId: "in-1" })).toBeNull();
      expect(toAnsweredNotifications({ registration, callId: null })).toBeNull();
    });
  });

  describe("toRejectedCallId", () => {
    const declined: TerminatedCall = { address, signal: { type: "call_reject" } };

    it("should name a call declined here", () => {
      expect(toRejectedCallId(declined)).toBe("in-1");
    });

    it("should name none for a call that ended another way", () => {
      const hungUp: TerminatedCall = { ...declined, signal: { type: "call_hangup" } };
      const endedElsewhere: TerminatedCall = { ...declined, signal: null };
      const noCall: TerminatedCall = { ...declined, address: null };

      expect(toRejectedCallId(hungUp)).toBeNull();
      expect(toRejectedCallId(endedElsewhere)).toBeNull();
      expect(toRejectedCallId(noCall)).toBeNull();
    });
  });

  describe("isCallId", () => {
    it("should tell a call id from none", () => {
      expect(isCallId("in-1")).toBe(true);
      expect(isCallId(null)).toBe(false);
    });
  });

  describe("readShownCallId", () => {
    it("should read the call of a shown incoming notification", () => {
      expect(readShownCallId({ type: "call_notification_shown", callId: "in-1" })).toBe("in-1");
    });

    it("should read nothing from other messages", () => {
      expect(readShownCallId({ type: "call_notification_opened", callId: "in-1" })).toBeNull();
      expect(readShownCallId({ type: "call_notification_shown", callId: "" })).toBeNull();
      expect(readShownCallId({ type: "call_notification_shown" })).toBeNull();
      expect(readShownCallId(null)).toBeNull();
      expect(readShownCallId("call_notification_shown")).toBeNull();
    });
  });

  describe("toLateNotifications", () => {
    it("should target the notifications of the call answered here", () => {
      expect(toLateNotifications({ registration, answeredHere: "in-1" }, "in-1")).toEqual({
        registration,
        callId: "in-1",
      });
    });

    it("should target nothing for another call, no message or no registration", () => {
      expect(toLateNotifications({ registration, answeredHere: "in-1" }, "in-2")).toBeNull();
      expect(toLateNotifications({ registration, answeredHere: null }, "in-1")).toBeNull();
      expect(toLateNotifications({ registration, answeredHere: "in-1" }, null)).toBeNull();
      expect(toLateNotifications({ registration: null, answeredHere: "in-1" }, "in-1")).toBeNull();
    });
  });

  describe("isCallNotificationsTarget", () => {
    it("should tell a target from none", () => {
      expect(isCallNotificationsTarget({ registration, callId: "in-1" })).toBe(true);
      expect(isCallNotificationsTarget(null)).toBe(false);
    });
  });

  describe("closeCallNotifications", () => {
    it("should close every notification tagged with the call", async () => {
      const first = { close: vi.fn() };
      const second = { close: vi.fn() };
      const tagged = registrationWith(async () => null, [first, second]);

      await closeCallNotifications({ registration: tagged, callId: "in-1" });

      expect(tagged.getNotifications).toHaveBeenCalledWith({ tag: "call-in-1" });
      expect(first.close).toHaveBeenCalledTimes(1);
      expect(second.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("toAcceptSignal and toRejectSignal", () => {
    it("should name the device's endpoint when it is known", () => {
      expect(toAcceptSignal(ENDPOINT, address)).toEqual({
        role: "student",
        message: { type: "call_accept", callId: "in-1", pushEndpoint: ENDPOINT },
      });
      expect(toRejectSignal(ENDPOINT)).toEqual({ type: "call_reject", pushEndpoint: ENDPOINT });
    });

    it("should leave the endpoint out when it is unknown or empty", () => {
      expect(toAcceptSignal(null, address).message).toEqual({
        type: "call_accept",
        callId: "in-1",
      });
      expect(toAcceptSignal("", address).message).toEqual({ type: "call_accept", callId: "in-1" });
      expect(toRejectSignal(null)).toEqual({ type: "call_reject" });
    });
  });
});
