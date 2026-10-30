import { randomUUID } from "crypto";
import { installWebPushDelivery, uniqueEmail, useVapidEnv } from "../../../__tests__/helpers";
import type { PushDelivery } from "../../../__tests__/helpers";
import { prisma } from "../../../lib/prisma";
import { MAX_PUSH_SUBSCRIPTIONS_PER_OWNER } from "../../pushSubscription";
import { hasCallNotificationDevices, notifyCallClosed, notifyIncomingCall } from "..";
import { toTopic } from "../callNotification.helpers";
import type { CallNotificationMessage } from "../callNotification.types";

jest.mock("web-push", () => ({ sendNotification: jest.fn() }));

describe("callNotification service", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;
  let delivery: PushDelivery;

  const tutor = () => ({ kind: "tutor" as const, id: tutorId });
  const student = () => ({ kind: "student" as const, id: studentUserId });

  const message = (
    kind: CallNotificationMessage["kind"],
    recipientKind: CallNotificationMessage["recipientKind"] = "student"
  ): CallNotificationMessage => ({ kind, callId: "call-1", callerName: "Анна", recipientKind });

  const addDevice = (owner: { userId: string } | { studentUserId: string }) =>
    prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${randomUUID()}`,
        p256dh: "k",
        auth: "a",
        ...owner,
      },
    });

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), password: "hash", name: "Анна" },
    });
    tutorId = user.id;
    const created = await prisma.student.create({ data: { name: "Иван", tutorId } });
    studentId = created.id;
    const studentUser = await prisma.studentUser.create({
      data: { email: uniqueEmail(), password: "hash", name: "Иван", studentId },
    });
    studentUserId = studentUser.id;
  });

  useVapidEnv();

  beforeEach(() => {
    delivery = installWebPushDelivery();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await prisma.pushSubscription.deleteMany({
      where: { OR: [{ userId: tutorId }, { studentUserId }] },
    });
    await prisma.reminderSettings.deleteMany({ where: { userId: tutorId } });
  });

  afterAll(async () => {
    await prisma.studentUser.delete({ where: { id: studentUserId } });
    await prisma.student.delete({ where: { id: studentId } });
    await prisma.user.delete({ where: { id: tutorId } });
  });

  describe("hasCallNotificationDevices", () => {
    it("should find the student's subscribed devices", async () => {
      expect(await hasCallNotificationDevices(student())).toBe(false);

      await addDevice({ studentUserId });

      expect(await hasCallNotificationDevices(student())).toBe(true);
    });

    it("should count a tutor without notification settings as reachable", async () => {
      await addDevice({ userId: tutorId });

      expect(await hasCallNotificationDevices(tutor())).toBe(true);
    });

    it("should not count a tutor who turned call notifications off", async () => {
      await addDevice({ userId: tutorId });
      await prisma.reminderSettings.create({
        data: { userId: tutorId, callNotificationsEnabled: false },
      });

      expect(await hasCallNotificationDevices(tutor())).toBe(false);
      expect(await notifyIncomingCall(tutor(), message("incoming_call", "tutor"))).toBe(0);
      expect(delivery).not.toHaveBeenCalled();
    });

    it("should count a tutor whose call notifications stay on next to muted reminders", async () => {
      await addDevice({ userId: tutorId });
      await prisma.reminderSettings.create({
        data: { userId: tutorId, enabled: false, callNotificationsEnabled: true },
      });

      expect(await hasCallNotificationDevices(tutor())).toBe(true);
    });

    it("should find no devices while push is not configured on the server", async () => {
      await addDevice({ studentUserId });
      delete process.env.VAPID_PUBLIC_KEY;

      expect(await hasCallNotificationDevices(student())).toBe(false);
      expect(await notifyIncomingCall(student(), message("incoming_call"))).toBe(0);
      expect(delivery).not.toHaveBeenCalled();
    });
  });

  describe("notifyIncomingCall", () => {
    it("should ring every device of the student urgently and count the deliveries", async () => {
      const first = await addDevice({ studentUserId });
      const second = await addDevice({ studentUserId });

      const delivered = await notifyIncomingCall(student(), message("incoming_call"));

      expect(delivered).toBe(2);
      expect(delivery.mock.calls.map(([endpoint]) => endpoint).sort()).toEqual(
        [first.endpoint, second.endpoint].sort()
      );
      const [, payload, headers] = delivery.mock.calls[0];
      expect(JSON.parse(payload)).toEqual({
        title: "Входящий видеозвонок",
        body: "Анна",
        tag: "call-call-1",
        data: {
          type: "incoming_call",
          callId: "call-1",
          url: "/student/cabinet/schedule?call=call-1",
        },
      });
      expect(headers).toEqual({ TTL: "40", Urgency: "high", Topic: toTopic("call-1") });
    });

    it("should ring only the newest devices up to the per-owner cap", async () => {
      const devices = await Promise.all(
        Array.from({ length: MAX_PUSH_SUBSCRIPTIONS_PER_OWNER + 2 }, (_, index) =>
          prisma.pushSubscription.create({
            data: {
              endpoint: `https://push.example.com/${randomUUID()}`,
              p256dh: "k",
              auth: "a",
              studentUserId,
              createdAt: new Date(Date.now() - (index + 1) * 60_000),
            },
          })
        )
      );

      const delivered = await notifyIncomingCall(student(), message("incoming_call"));

      expect(delivered).toBe(MAX_PUSH_SUBSCRIPTIONS_PER_OWNER);
      expect(delivery.mock.calls.map(([endpoint]) => endpoint).sort()).toEqual(
        devices
          .slice(0, MAX_PUSH_SUBSCRIPTIONS_PER_OWNER)
          .map((device) => device.endpoint)
          .sort()
      );
    });

    it("should open the tutor's own page from the tutor's notification", async () => {
      await addDevice({ userId: tutorId });

      await notifyIncomingCall(tutor(), message("incoming_call", "tutor"));

      expect(JSON.parse(delivery.mock.calls[0][1]).data.url).toBe("/dashboard?call=call-1");
    });

    it("should forget a gone subscription and not count it", async () => {
      const gone = await addDevice({ studentUserId });
      await addDevice({ studentUserId });
      delivery.mockImplementation(async (endpoint) => {
        if (endpoint === gone.endpoint) throw Object.assign(new Error("gone"), { statusCode: 410 });
      });

      const delivered = await notifyIncomingCall(student(), message("incoming_call"));

      expect(delivered).toBe(1);
      expect(await prisma.pushSubscription.findUnique({ where: { id: gone.id } })).toBeNull();
    });

    it("should count nothing when no device can be reached", async () => {
      await addDevice({ studentUserId });
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      delivery.mockRejectedValue(new Error("ECONNREFUSED"));

      expect(await notifyIncomingCall(student(), message("incoming_call"))).toBe(0);
    });
  });

  describe("notifyCallClosed", () => {
    it("should tell the devices about the missed call for a day", async () => {
      await addDevice({ studentUserId });

      await notifyCallClosed(student(), message("missed_call"));

      const [, payload, headers] = delivery.mock.calls[0];
      expect(JSON.parse(payload)).toMatchObject({
        body: "Пропущенный звонок от Анна",
        tag: "call-call-1",
        data: { type: "missed_call", url: "/student/cabinet/calls" },
      });
      expect(headers).toEqual({ TTL: "86400", Urgency: "normal", Topic: toTopic("call-1") });
    });

    it("should leave out the device that answered the call", async () => {
      const answering = await addDevice({ studentUserId });
      const other = await addDevice({ studentUserId });

      await notifyCallClosed(student(), message("call_closed"), {
        exceptEndpoint: answering.endpoint,
      });

      expect(delivery.mock.calls.map(([endpoint]) => endpoint)).toEqual([other.endpoint]);
    });

    it("should send nothing when the only device is the one that answered", async () => {
      const answering = await addDevice({ studentUserId });

      await notifyCallClosed(student(), message("call_closed"), {
        exceptEndpoint: answering.endpoint,
      });

      expect(delivery).not.toHaveBeenCalled();
    });

    it("should not widen the closing fan-out past the devices that heard of the call", async () => {
      const devices = await Promise.all(
        Array.from({ length: MAX_PUSH_SUBSCRIPTIONS_PER_OWNER + 1 }, (_, index) =>
          prisma.pushSubscription.create({
            data: {
              endpoint: `https://push.example.com/${randomUUID()}`,
              p256dh: "k",
              auth: "a",
              studentUserId,
              createdAt: new Date(Date.now() - (index + 1) * 60_000),
            },
          })
        )
      );

      await notifyCallClosed(student(), message("call_closed"), {
        exceptEndpoint: devices[0].endpoint,
      });

      expect(delivery.mock.calls.map(([endpoint]) => endpoint).sort()).toEqual(
        devices
          .slice(1, MAX_PUSH_SUBSCRIPTIONS_PER_OWNER)
          .map((device) => device.endpoint)
          .sort()
      );
    });

    it("should not fail when the push service does", async () => {
      await addDevice({ studentUserId });
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      delivery.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(notifyCallClosed(student(), message("call_closed"))).resolves.toBeUndefined();
    });
  });
});
