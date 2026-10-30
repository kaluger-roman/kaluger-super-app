import { randomUUID } from "crypto";
import {
  callWebSocket,
  installWebPushDelivery,
  uniqueEmail,
  useVapidEnv,
  waitFor,
} from "../../../__tests__/helpers";
import type { PushDelivery } from "../../../__tests__/helpers";
import { prisma } from "../../../lib/prisma";
import { sendPushToUser } from "../../pushNotification";
import type { CallSignalingInbound, CallerKindValue } from "../../../types";
import { processCallSignal } from "../callFlow";
import { participantDisconnected } from "../callReconnect";
import * as callRegistry from "../callSignaling";
import { RING_TIMEOUT_MS } from "../callSignaling.constants";

jest.mock(
  "../../../lib/wsManager",
  () => jest.requireActual("../../../__tests__/helpers").callWebSocketManagerModule
);
jest.mock("web-push", () => ({ sendNotification: jest.fn() }));

const { messagesOfType } = callWebSocket;

const signal = (kind: CallerKindValue, id: string, data: CallSignalingInbound): Promise<void> =>
  processCallSignal({ kind, id }, data);

const presence = (value: "on_screen" | "background"): CallSignalingInbound => ({
  type: "presence_update",
  presence: value,
  audioSuspended: false,
  videoSuspended: false,
});

const withFakeTimers = async (run: () => Promise<void> | void): Promise<void> => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  try {
    await run();
  } finally {
    jest.useRealTimers();
  }
};

describe("call notifications in the call flow", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;
  let delivery: PushDelivery;

  const student = () => ({ kind: "student" as const, id: studentUserId });

  const pushTypes = (): string[] =>
    delivery.mock.calls.map(([, payload]) => JSON.parse(payload).data.type);

  const subscribeStudent = () =>
    prisma.pushSubscription.create({
      data: {
        endpoint: `https://push.example.com/${randomUUID()}`,
        p256dh: "k",
        auth: "a",
        studentUserId,
      },
    });

  const invite = async (): Promise<void> => {
    await signal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
  };

  const ringingCallId = (): string => {
    const ringing = messagesOfType("call_ringing")[0]?.message;
    if (ringing?.type !== "call_ringing") throw new Error("no ringing");
    return ringing.callId;
  };

  const latestRecord = () =>
    prisma.callRecord.findFirstOrThrow({ where: { tutorId }, orderBy: { createdAt: "desc" } });

  const historyRefreshed = () => messagesOfType("call_history_updated").length >= 2;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail(), password: "hash", name: "Анна Петрова" },
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
    callWebSocket.reset();
    callWebSocket.connect("tutor", tutorId);
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    await prisma.pushSubscription.deleteMany({ where: { studentUserId } });
    await prisma.callRecord.deleteMany({ where: { tutorId } });
  });

  afterAll(async () => {
    await prisma.studentUser.delete({ where: { id: studentUserId } });
    await prisma.student.delete({ where: { id: studentId } });
    await prisma.user.delete({ where: { id: tutorId } });
  });

  const connectStudent = () => {
    callWebSocket.connect("student", studentUserId);
  };

  describe("ringing a callee without an open app", () => {
    it("should ring the student's devices and keep the call ringing", async () => {
      await subscribeStudent();

      await invite();

      const callId = ringingCallId();
      expect(messagesOfType("call_unavailable")).toHaveLength(0);
      expect(messagesOfType("call_incoming")).toHaveLength(0);
      expect(pushTypes()).toEqual(["incoming_call"]);
      expect(JSON.parse(delivery.mock.calls[0][1])).toMatchObject({
        body: "Анна Петрова",
        data: { callId, url: `/student/cabinet/schedule?call=${callId}` },
      });
      expect(delivery.mock.calls[0][2]).toMatchObject({ TTL: "40", Urgency: "high" });
      expect(callRegistry.getCall(callId)?.pushNotified).toBe(true);
    });

    it("should say the student is offline when there is no device either", async () => {
      await invite();

      expect(messagesOfType("call_ringing")).toHaveLength(0);
      expect(messagesOfType("call_unavailable")[0].message).toMatchObject({
        reason: "offline",
        inviteId: "invite-1",
      });
      expect(delivery).not.toHaveBeenCalled();
      expect((await latestRecord()).status).toBe("MISSED");
    });

    it("should give up the call when no device took the notification", async () => {
      await subscribeStudent();
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      delivery.mockRejectedValue(new Error("ECONNREFUSED"));

      await invite();

      const callId = ringingCallId();
      expect(messagesOfType("call_unavailable")[0].message).toEqual({
        type: "call_unavailable",
        reason: "offline",
        callId,
      });
      expect(callRegistry.getCall(callId)).toBeUndefined();
      await waitFor(historyRefreshed);
      expect((await latestRecord()).status).toBe("MISSED");
      await waitFor(() => pushTypes().length === 2);
      expect(pushTypes()).toEqual(["incoming_call", "missed_call"]);
    });

    it("should not notify a student who is busy in another call", async () => {
      await subscribeStudent();
      const other = await prisma.user.create({
        data: { email: uniqueEmail(), password: "hash", name: "Другой" },
      });
      const busyCall = callRegistry.startCall(
        {
          tutorUserId: other.id,
          studentUserId,
          studentId,
          studentName: "Иван",
          tutorName: "Другой",
        },
        "tutor",
        null,
        () => undefined
      );
      try {
        await invite();

        expect(messagesOfType("call_busy")).toHaveLength(1);
        expect(delivery).not.toHaveBeenCalled();
      } finally {
        callRegistry.removeCall(busyCall.callId);
        await prisma.user.delete({ where: { id: other.id } });
      }
    });

    it("should keep the 40 s ring timeout", async () => {
      await subscribeStudent();

      await withFakeTimers(async () => {
        await invite();
        jest.advanceTimersByTime(RING_TIMEOUT_MS - 1);
        expect(messagesOfType("call_no_answer")).toHaveLength(0);
        jest.advanceTimersByTime(1);
      });

      expect(messagesOfType("call_no_answer")).toHaveLength(1);
      await waitFor(() => pushTypes().includes("missed_call"));
      expect(pushTypes()).toEqual(["incoming_call", "missed_call"]);
    });
  });

  describe("ringing a callee with an open app", () => {
    it("should not notify the devices while the app is on screen", async () => {
      await subscribeStudent();
      connectStudent();

      await invite();

      expect(messagesOfType("call_incoming")).toHaveLength(1);
      expect(delivery).not.toHaveBeenCalled();
    });

    it("should both show the call and notify the devices of an app in the background", async () => {
      await subscribeStudent();
      connectStudent();
      await signal("student", studentUserId, presence("background"));

      await invite();

      expect(messagesOfType("call_incoming")).toHaveLength(1);
      expect(pushTypes()).toEqual(["incoming_call"]);
    });

    it("should notify the devices once when the student puts the incoming call away", async () => {
      await subscribeStudent();
      connectStudent();
      await invite();
      expect(delivery).not.toHaveBeenCalled();

      await signal("student", studentUserId, presence("background"));
      await signal("student", studentUserId, presence("on_screen"));
      await signal("student", studentUserId, presence("background"));

      await waitFor(() => delivery.mock.calls.length > 0);
      expect(pushTypes()).toEqual(["incoming_call"]);
    });

    it("should keep ringing and notify the devices when the student loses the connection", async () => {
      await subscribeStudent();
      connectStudent();
      await invite();
      const callId = ringingCallId();

      callWebSocket.disconnect("student", studentUserId);
      await participantDisconnected(student());

      expect(callRegistry.getCall(callId)?.status).toBe("ringing");
      expect(messagesOfType("call_unavailable")).toHaveLength(0);
      expect(pushTypes()).toEqual(["incoming_call"]);
    });

    it("should let another tab of the student take over the ringing call when the holding tab loses the connection", async () => {
      await subscribeStudent();
      connectStudent();
      await invite();

      callWebSocket.disconnect("student", studentUserId);
      await participantDisconnected(student());

      expect(callWebSocket.releasedHolderGone).toEqual([`student:${studentUserId}`]);
      expect(callWebSocket.released).toEqual([]);
      expect(callRegistry.getCall(ringingCallId())?.status).toBe("ringing");
    });

    it("should give up the call when the student loses the connection and no device takes the notification", async () => {
      await subscribeStudent();
      connectStudent();
      await invite();
      const callId = ringingCallId();
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      delivery.mockRejectedValue(new Error("ECONNREFUSED"));

      callWebSocket.disconnect("student", studentUserId);
      await participantDisconnected(student());

      expect(callRegistry.getCall(callId)).toBeUndefined();
      expect(messagesOfType("call_unavailable")).toEqual([
        {
          kind: "tutor",
          id: tutorId,
          message: { type: "call_unavailable", reason: "offline", callId },
        },
      ]);
      await waitFor(historyRefreshed);
      expect((await latestRecord()).status).toBe("MISSED");
      await waitFor(() => pushTypes().length === 2);
    });

    it("should keep ringing when the student who loses the connection was notified before", async () => {
      await subscribeStudent();
      connectStudent();
      await signal("student", studentUserId, presence("background"));
      await invite();
      const callId = ringingCallId();
      delivery.mockRejectedValue(new Error("ECONNREFUSED"));

      callWebSocket.disconnect("student", studentUserId);
      await participantDisconnected(student());

      expect(callRegistry.getCall(callId)?.status).toBe("ringing");
      expect(messagesOfType("call_unavailable")).toHaveLength(0);
      expect(pushTypes()).toEqual(["incoming_call"]);
    });

    it("should give up the call when the student notified in the background, on no device, loses the connection", async () => {
      await subscribeStudent();
      connectStudent();
      await signal("student", studentUserId, presence("background"));
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      delivery.mockRejectedValue(new Error("ECONNREFUSED"));
      await invite();
      const callId = ringingCallId();
      expect(callRegistry.getCall(callId)?.status).toBe("ringing");

      callWebSocket.disconnect("student", studentUserId);
      await participantDisconnected(student());

      expect(callRegistry.getCall(callId)).toBeUndefined();
      expect(messagesOfType("call_unavailable")).toEqual([
        {
          kind: "tutor",
          id: tutorId,
          message: { type: "call_unavailable", reason: "offline", callId },
        },
      ]);
      await waitFor(historyRefreshed);
      expect((await latestRecord()).status).toBe("MISSED");
      await waitFor(() => pushTypes().length === 2);
      expect(pushTypes()).toEqual(["incoming_call", "missed_call"]);
    });

    it("should give up the call when the student loses the connection while the notification of the put-away call reaches no device", async () => {
      await subscribeStudent();
      connectStudent();
      await invite();
      const callId = ringingCallId();
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      delivery.mockRejectedValue(new Error("ECONNREFUSED"));

      await signal("student", studentUserId, presence("background"));
      callWebSocket.disconnect("student", studentUserId);
      await participantDisconnected(student());

      expect(callRegistry.getCall(callId)).toBeUndefined();
      expect(messagesOfType("call_unavailable")).toHaveLength(1);
      await waitFor(() => pushTypes().length === 2);
      expect(pushTypes()).toEqual(["incoming_call", "missed_call"]);
    });

    it("should still end the call of a student without devices who loses the connection", async () => {
      connectStudent();
      await invite();
      const callId = ringingCallId();

      callWebSocket.disconnect("student", studentUserId);
      await participantDisconnected(student());

      expect(callRegistry.getCall(callId)).toBeUndefined();
      expect(messagesOfType("call_unavailable")).toHaveLength(1);
    });
  });

  describe("closing the notification", () => {
    const ringOffline = async (): Promise<string> => {
      await subscribeStudent();
      await invite();
      return ringingCallId();
    };

    it("should tell the devices about a missed call when the tutor cancels", async () => {
      const callId = await ringOffline();

      await signal("tutor", tutorId, { type: "call_cancel", callId });

      await waitFor(() => pushTypes().length === 2);
      expect(pushTypes()).toEqual(["incoming_call", "missed_call"]);
      expect(JSON.parse(delivery.mock.calls[1][1]).body).toBe("Пропущенный звонок от Анна Петрова");
    });

    it("should tell the devices about a missed call when the call is given up after the notification seemed to reach none", async () => {
      await subscribeStudent();
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      // A push service that times out may still have shown the notification.
      delivery.mockRejectedValueOnce(new Error("ETIMEDOUT"));

      await invite();

      const callId = ringingCallId();
      expect(callRegistry.getCall(callId)).toBeUndefined();
      expect(messagesOfType("call_unavailable")).toHaveLength(1);
      await waitFor(() => pushTypes().length === 2);
      expect(pushTypes()).toEqual(["incoming_call", "missed_call"]);
      expect(JSON.parse(delivery.mock.calls[1][1]).data.callId).toBe(callId);
    });

    it("should close the notification on every device once the student answers without naming the device", async () => {
      const callId = await ringOffline();
      connectStudent();

      await signal("student", studentUserId, { type: "call_accept", callId });
      await signal("tutor", tutorId, { type: "call_hangup", callId });

      await waitFor(() => pushTypes().length === 2);
      expect(pushTypes()).toEqual(["incoming_call", "call_closed"]);
    });

    it("should close the notification on every device once the student rejects without naming the device", async () => {
      const callId = await ringOffline();
      connectStudent();

      await signal("student", studentUserId, { type: "call_reject", callId });

      await waitFor(() => pushTypes().length === 2);
      expect(pushTypes()).toEqual(["incoming_call", "call_closed"]);
    });

    describe("on the student's other devices only", () => {
      const closedOn = (): string[] =>
        delivery.mock.calls
          .filter(([, payload]) => JSON.parse(payload).data.type === "call_closed")
          .map(([endpoint]) => endpoint);

      const ringTwoDevices = async () => {
        const answering = await subscribeStudent();
        const other = await subscribeStudent();
        await invite();
        connectStudent();
        return { callId: ringingCallId(), answering, other };
      };

      it("should not tell the device that answered the call was answered on another device", async () => {
        const { callId, answering, other } = await ringTwoDevices();

        await signal("student", studentUserId, {
          type: "call_accept",
          callId,
          pushEndpoint: answering.endpoint,
        });

        await waitFor(() => closedOn().length === 1);
        expect(closedOn()).toEqual([other.endpoint]);
        expect(pushTypes()).toEqual(["incoming_call", "incoming_call", "call_closed"]);
      });

      it("should not tell the device that declined the call was declined on another device", async () => {
        const { callId, answering, other } = await ringTwoDevices();

        await signal("student", studentUserId, {
          type: "call_reject",
          callId,
          pushEndpoint: answering.endpoint,
        });

        await waitFor(() => closedOn().length === 1);
        expect(closedOn()).toEqual([other.endpoint]);
        expect(pushTypes()).toEqual(["incoming_call", "incoming_call", "call_closed"]);
      });

      it("should still close the notification on every device for an endpoint the student does not own", async () => {
        const { callId, answering, other } = await ringTwoDevices();

        await signal("student", studentUserId, {
          type: "call_accept",
          callId,
          pushEndpoint: "https://push.example.com/someone-else",
        });

        await waitFor(() => closedOn().length === 2);
        expect(closedOn().sort()).toEqual([answering.endpoint, other.endpoint].sort());
      });
    });

    it("should send no closing notification for a call the devices never heard of", async () => {
      await subscribeStudent();
      connectStudent();
      await invite();
      const callId = ringingCallId();

      await signal("tutor", tutorId, { type: "call_cancel", callId });
      await waitFor(historyRefreshed);

      expect(delivery).not.toHaveBeenCalled();
    });
  });

  describe("a tutor who turned call notifications off", () => {
    let lessonId: string;
    const tutorEndpoint = `https://push.example.com/tutor-${randomUUID()}`;

    beforeEach(async () => {
      callWebSocket.disconnect("tutor", tutorId);
      participantDisconnected({ kind: "tutor", id: tutorId });
      connectStudent();
      await prisma.pushSubscription.create({
        data: { endpoint: tutorEndpoint, p256dh: "k", auth: "a", userId: tutorId },
      });
      await prisma.reminderSettings.create({
        data: { userId: tutorId, enabled: true, intervals: [30], callNotificationsEnabled: false },
      });
      const start = new Date(Date.now() + 60 * 60 * 1000);
      const lesson = await prisma.lesson.create({
        data: {
          tutorId,
          studentId,
          subject: "MATHEMATICS",
          startTime: start,
          endTime: new Date(start.getTime() + 60 * 60 * 1000),
        },
      });
      lessonId = lesson.id;
    });

    afterEach(async () => {
      await prisma.pushSubscription.deleteMany({ where: { userId: tutorId } });
      await prisma.reminderSettings.deleteMany({ where: { userId: tutorId } });
      await prisma.lesson.deleteMany({ where: { id: lessonId } });
    });

    it("should tell the calling student the tutor is offline without notifying the devices", async () => {
      await signal("student", studentUserId, {
        type: "call_invite",
        inviteId: "invite-1",
        lessonId,
      });

      expect(messagesOfType("call_ringing")).toHaveLength(0);
      expect(messagesOfType("call_unavailable")[0]).toMatchObject({
        id: studentUserId,
        message: { reason: "offline", inviteId: "invite-1" },
      });
      expect(delivery).not.toHaveBeenCalled();
      expect((await latestRecord()).status).toBe("MISSED");
    });

    it("should keep sending lesson reminders to the same devices", async () => {
      const result = await sendPushToUser(tutorId, {
        title: "Урок через 30 минут",
        body: "Математика",
        tag: "reminder",
        data: { type: "lesson_reminder", lessonId, url: "/dashboard" },
      });

      expect(result).toEqual({ sent: 1, failed: 0 });
      expect(delivery.mock.calls.map(([endpoint]) => endpoint)).toEqual([tutorEndpoint]);
    });
  });
});
