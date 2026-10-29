import { callWebSocket, uniqueEmail, waitFor } from "../../../__tests__/helpers";

import { prisma } from "../../../lib/prisma";
import type { CallSignalingInbound, CallerKindValue } from "../../../types";
import { processCallSignal } from "../callFlow";
import { terminateActiveCallForParticipant } from "../callMessaging";
import * as callRegistry from "../callSignaling";
import { INVITE_RATE_LIMIT, RING_TIMEOUT_MS } from "../callSignaling.constants";
import * as callSignalingHelpers from "../callSignaling.helpers";

const HOUR_MS = 60 * 60 * 1000;

const OFFER = { type: "offer" as const, sdp: "v=0 offer" };
const ANSWER = { type: "answer" as const, sdp: "v=0 answer" };
const CANDIDATE = {
  candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ host",
  sdpMid: "0",
  sdpMLineIndex: 0,
  usernameFragment: null,
};

jest.mock(
  "../../../lib/wsManager",
  () => jest.requireActual("../../../__tests__/helpers").callWebSocketManagerModule
);

const { sent, messagesOfType } = callWebSocket;

const signal = (kind: CallerKindValue, id: string, data: CallSignalingInbound): Promise<void> =>
  processCallSignal({ kind, id }, data);

describe("processCallSignal", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;
  let otherTutorId: string;
  const extraStudentIds: string[] = [];
  const extraStudentUserIds: string[] = [];

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Анна",
      },
    });
    tutorId = tutor.id;
    const otherTutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Чужой",
      },
    });
    otherTutorId = otherTutor.id;
    const student = await prisma.student.create({
      data: { name: "Иван", tutorId },
    });
    studentId = student.id;
    const studentUser = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Иван",
        studentId,
      },
    });
    studentUserId = studentUser.id;
  });

  beforeEach(() => {
    callWebSocket.reset();
    callWebSocket.connect("tutor", tutorId);
    callWebSocket.connect("student", studentUserId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.lesson.deleteMany({ where: { tutorId: { in: [tutorId, otherTutorId] } } });
    await prisma.studentUser.deleteMany({
      where: { id: { in: [studentUserId, ...extraStudentUserIds] } },
    });
    await prisma.student.deleteMany({
      where: { OR: [{ id: { in: [studentId, ...extraStudentIds] } }, { tutorId: otherTutorId }] },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [tutorId, otherTutorId] } },
    });
    await prisma.$disconnect();
  });

  const invite = (inviteId = "invite-1"): Promise<void> =>
    signal("tutor", tutorId, { type: "call_invite", inviteId, targetStudentId: studentId });

  const inviteAndGetCallId = async (inviteId = "invite-1"): Promise<string> => {
    await invite(inviteId);
    const ringing = messagesOfType("call_ringing")[0].message;
    if (ringing.type !== "call_ringing") throw new Error("no ringing");
    callWebSocket.clearSent();
    return ringing.callId;
  };

  const inviteAndAccept = async (): Promise<string> => {
    const callId = await inviteAndGetCallId();
    await signal("student", studentUserId, { type: "call_accept", callId });
    callWebSocket.clearSent();
    return callId;
  };

  const createLesson = (data: { tutorId: string; studentId: string }) => {
    const start = new Date(Date.now() + HOUR_MS);
    return prisma.lesson.create({
      data: {
        ...data,
        subject: "MATHEMATICS",
        startTime: start,
        endTime: new Date(start.getTime() + HOUR_MS),
      },
    });
  };

  const createLinkedStudent = async () => {
    const student = await prisma.student.create({ data: { name: "Пётр", tutorId } });
    const studentUser = await prisma.studentUser.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Пётр",
        studentId: student.id,
      },
    });
    extraStudentIds.push(student.id);
    extraStudentUserIds.push(studentUser.id);
    return { studentId: student.id, studentUserId: studentUser.id };
  };

  it("should send call_incoming to the callee and call_ringing to the caller on a valid invite", async () => {
    await invite();

    const incoming = messagesOfType("call_incoming");
    const ringing = messagesOfType("call_ringing");
    expect(incoming).toHaveLength(1);
    expect(incoming[0].id).toBe(studentUserId);
    expect(incoming[0].message).toMatchObject({ callerName: "Анна", lesson: null });
    expect(incoming[0].message).toHaveProperty("iceServers");
    expect(ringing).toHaveLength(1);
    expect(ringing[0].id).toBe(tutorId);
    expect(ringing[0].message).not.toHaveProperty("iceServers");
    expect(ringing[0].message).toMatchObject({ inviteId: "invite-1" });
  });

  it("should answer call_unavailable when the callee is offline", async () => {
    callWebSocket.disconnect("student", studentUserId);

    await invite();

    expect(messagesOfType("call_unavailable")).toHaveLength(1);
    expect(messagesOfType("call_unavailable")[0].message).toMatchObject({ inviteId: "invite-1" });
    expect(messagesOfType("call_incoming")).toHaveLength(0);
  });

  it("should not start a call when the caller went offline while the pair was resolved", async () => {
    callWebSocket.disconnect("tutor", tutorId);

    await invite();

    expect(sent).toHaveLength(0);
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)).toBeUndefined();
  });

  it("should answer call_busy when the callee already has an active call", async () => {
    const pair = await callSignalingHelpers.resolvePairForTutor(tutorId, studentId);
    callRegistry.startCall(pair, "student", null, () => undefined);

    await invite();

    expect(messagesOfType("call_busy")).toHaveLength(1);
    expect(messagesOfType("call_busy")[0].message).toEqual({
      type: "call_busy",
      inviteId: "invite-1",
    });
  });

  it("should replace its own ringing call with a new one when the caller invites again", async () => {
    const firstCallId = await inviteAndGetCallId("invite-1");

    await invite("invite-2");

    const ringing = messagesOfType("call_ringing");
    expect(ringing).toHaveLength(1);
    expect(ringing[0].message).toMatchObject({ inviteId: "invite-2" });
    const secondCallId = (ringing[0].message as { callId: string }).callId;
    expect(secondCallId).not.toBe(firstCallId);
    const toStudent = sent
      .filter((c) => c.id === studentUserId && c.message.type !== "call_history_updated")
      .map((c) => c.message);
    expect(toStudent).toEqual([
      { type: "call_canceled", callId: firstCallId, reason: "canceled" },
      expect.objectContaining({ type: "call_incoming", callId: secondCallId }),
    ]);
    expect(
      await prisma.callRecord.count({ where: { tutorId, studentId, status: "CANCELED" } })
    ).toBeGreaterThanOrEqual(1);
  });

  it("should ring only the latest invite when an older one resolves after it", async () => {
    const resolvePair = callSignalingHelpers.resolvePairForTutor;
    let releaseFirst: () => void = () => undefined;
    jest
      .spyOn(callSignalingHelpers, "resolvePairForTutor")
      .mockImplementationOnce(async (...args) => {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
        return resolvePair(...args);
      });

    const first = invite("invite-1");
    await invite("invite-2");
    releaseFirst();
    await first;

    const ringing = messagesOfType("call_ringing");
    expect(ringing.map((c) => c.message)).toEqual([
      expect.objectContaining({ inviteId: "invite-2" }),
    ]);
    expect(messagesOfType("call_incoming")).toHaveLength(1);
    expect(messagesOfType("call_canceled")).toHaveLength(0);
    const callId = (ringing[0].message as { callId: string }).callId;
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)?.callId).toBe(callId);
  });

  it("should drop an older invite that resolves first once a newer one was sent", async () => {
    await Promise.all([invite("invite-1"), invite("invite-2")]);

    expect(messagesOfType("call_ringing").map((c) => c.message)).toEqual([
      expect.objectContaining({ inviteId: "invite-2" }),
    ]);
    expect(messagesOfType("call_incoming")).toHaveLength(1);
    expect(messagesOfType("call_canceled")).toHaveLength(0);
  });

  it("should replace its own ringing call when the caller calls another student", async () => {
    const firstCallId = await inviteAndGetCallId("invite-1");
    const other = await createLinkedStudent();
    callWebSocket.connect("student", other.studentUserId);

    await signal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-2",
      targetStudentId: other.studentId,
    });

    expect(messagesOfType("call_canceled")).toEqual([
      {
        kind: "student",
        id: studentUserId,
        message: { type: "call_canceled", callId: firstCallId, reason: "canceled" },
      },
    ]);
    expect(messagesOfType("call_incoming")[0].id).toBe(other.studentUserId);
    expect(messagesOfType("call_ringing")[0].message).toMatchObject({ inviteId: "invite-2" });
    expect(messagesOfType("call_error")).toHaveLength(0);
  });

  it("should keep the new call ringing when a stale call_cancel for the replaced call arrives", async () => {
    const firstCallId = await inviteAndGetCallId("invite-1");
    const secondCallId = await inviteAndGetCallId("invite-2");

    await signal("tutor", tutorId, { type: "call_cancel", callId: firstCallId });

    expect(sent).toHaveLength(0);
    expect(callRegistry.getCall(secondCallId)?.status).toBe("ringing");
  });

  it("should relay offer, answer and ice to the peer after the callee accepts", async () => {
    const callId = await inviteAndAccept();

    await signal("tutor", tutorId, { type: "webrtc_offer", callId, sdp: OFFER });
    await signal("student", studentUserId, { type: "webrtc_answer", callId, sdp: ANSWER });
    await signal("tutor", tutorId, { type: "webrtc_ice", callId, candidate: CANDIDATE });

    const offer = messagesOfType("webrtc_offer")[0];
    expect(offer.id).toBe(studentUserId);
    expect(offer.message).toMatchObject({ sdp: OFFER });
    const answer = messagesOfType("webrtc_answer")[0];
    expect(answer.id).toBe(tutorId);
    expect(answer.message).toMatchObject({ sdp: ANSWER });
    const ice = messagesOfType("webrtc_ice")[0];
    expect(ice.id).toBe(studentUserId);
    expect(ice.message).toEqual({ type: "webrtc_ice", callId, candidate: CANDIDATE });
  });

  it("should relay call_media_state with cameraAvailable after the callee accepts", async () => {
    const callId = await inviteAndAccept();

    await signal("student", studentUserId, {
      type: "call_media_state",
      callId,
      micOn: true,
      cameraOn: false,
      screenSharing: false,
      cameraAvailable: false,
    });

    const media = messagesOfType("call_media_state");
    expect(media).toHaveLength(1);
    expect(media[0].id).toBe(tutorId);
    expect(media[0].message).toMatchObject({ cameraOn: false, cameraAvailable: false });
  });

  it("should answer call_error to a sender that is not part of an existing call", async () => {
    const callId = await inviteAndAccept();

    await signal("tutor", otherTutorId, { type: "webrtc_offer", callId, sdp: OFFER });

    expect(messagesOfType("call_error")).toHaveLength(1);
    expect(messagesOfType("call_error")[0]).toMatchObject({
      id: otherTutorId,
      message: { callId },
    });
    expect(messagesOfType("webrtc_offer")).toHaveLength(0);
  });

  it.each<CallSignalingInbound>([
    { type: "call_accept", callId: "gone" },
    { type: "call_reject", callId: "gone" },
    { type: "call_cancel", callId: "gone" },
    { type: "call_hangup", callId: "gone" },
    { type: "call_connected", callId: "gone" },
    { type: "webrtc_ice", callId: "gone", candidate: CANDIDATE },
    {
      type: "call_media_state",
      callId: "gone",
      micOn: true,
      cameraOn: true,
      screenSharing: false,
      cameraAvailable: true,
    },
  ])("should drop $type for an unknown call without answering", async (data) => {
    await signal("tutor", tutorId, data);

    expect(sent).toHaveLength(0);
  });

  it("should not relay offers, ICE or media state while the call is still ringing", async () => {
    const callId = await inviteAndGetCallId();

    await signal("tutor", tutorId, { type: "webrtc_offer", callId, sdp: OFFER });
    await signal("tutor", tutorId, { type: "webrtc_ice", callId, candidate: CANDIDATE });
    await signal("tutor", tutorId, {
      type: "call_media_state",
      callId,
      micOn: true,
      cameraOn: true,
      screenSharing: false,
      cameraAvailable: true,
    });

    expect(sent).toHaveLength(0);
  });

  it("should ignore call_accept and call_reject sent by the caller", async () => {
    const callId = await inviteAndGetCallId();

    await signal("tutor", tutorId, { type: "call_accept", callId });
    await signal("tutor", tutorId, { type: "call_reject", callId });

    expect(sent).toHaveLength(0);
    expect(callRegistry.getCall(callId)?.status).toBe("ringing");
  });

  it("should ignore call_cancel sent by the callee", async () => {
    const callId = await inviteAndGetCallId();

    await signal("student", studentUserId, { type: "call_cancel", callId });

    expect(sent).toHaveLength(0);
    expect(callRegistry.getCall(callId)).toBeDefined();
  });

  it("should end the call with call_ended when the caller cancels after the callee accepted", async () => {
    const callId = await inviteAndAccept();

    await signal("tutor", tutorId, { type: "call_cancel", callId });

    const ended = messagesOfType("call_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].id).toBe(studentUserId);
    expect(callRegistry.getCall(callId)).toBeUndefined();
  });

  it("should not mark the call connected before the callee accepts", async () => {
    const callId = await inviteAndGetCallId();

    await signal("tutor", tutorId, { type: "call_connected", callId });

    expect(callRegistry.getCall(callId)?.connectedAt).toBeUndefined();
  });

  it("should answer call_error when the caller is already talking to another student", async () => {
    await inviteAndAccept();
    const other = await createLinkedStudent();
    callWebSocket.connect("student", other.studentUserId);

    await signal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: other.studentId,
    });

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Сначала завершите текущий звонок",
      inviteId: "invite-1",
    });
    expect(messagesOfType("call_incoming")).toHaveLength(0);
  });

  it("should answer call_error when a sender exceeds the invite rate limit", async () => {
    for (let attempt = 0; attempt < INVITE_RATE_LIMIT; attempt += 1) {
      await invite(`invite-${attempt}`);
    }
    callWebSocket.clearSent();

    await invite("invite-over");

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Слишком много звонков. Попробуйте через минуту",
      inviteId: "invite-over",
    });
    expect(messagesOfType("call_ringing")).toHaveLength(0);
  });

  it("should ring an archived student, with and without a lesson", async () => {
    const lesson = await createLesson({ tutorId, studentId });
    await prisma.student.update({ where: { id: studentId }, data: { archived: true } });
    try {
      await invite("invite-1");
      await signal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-2",
        targetStudentId: studentId,
        lessonId: lesson.id,
      });
    } finally {
      await prisma.student.update({ where: { id: studentId }, data: { archived: false } });
    }

    expect(messagesOfType("call_error")).toHaveLength(0);
    const incoming = messagesOfType("call_incoming");
    expect(incoming.map((c) => c.id)).toEqual([studentUserId, studentUserId]);
    expect(incoming[1].message).toMatchObject({ lesson: { id: lesson.id } });
  });

  it("should send call_no_answer to the caller and call_canceled to the callee when ringing times out", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask", "Date"] });
    try {
      await invite();
      callWebSocket.clearSent();

      jest.advanceTimersByTime(RING_TIMEOUT_MS);
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => messagesOfType("call_history_updated").length === 2);

    const noAnswer = messagesOfType("call_no_answer");
    expect(noAnswer).toHaveLength(1);
    expect(noAnswer[0].id).toBe(tutorId);
    const canceled = messagesOfType("call_canceled");
    expect(canceled).toHaveLength(1);
    expect(canceled[0].id).toBe(studentUserId);
    expect(canceled[0].message).toMatchObject({ reason: "timeout" });
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)).toBeUndefined();
    expect(callWebSocket.released).toEqual([`tutor:${tutorId}`, `student:${studentUserId}`]);
  });

  it("should answer call_error without a database lookup when a tutor invites nobody", async () => {
    const findStudent = jest.spyOn(prisma.student, "findUnique");

    await signal("tutor", tutorId, { type: "call_invite", inviteId: "invite-1" });

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Не выбран ученик для звонка",
    });
    expect(findStudent).not.toHaveBeenCalled();
  });

  it("should not start a call when the caller's socket was replaced while the pair was resolved", async () => {
    const pending = invite();
    callWebSocket.replaceConnection("tutor", tutorId);
    await pending;

    expect(messagesOfType("call_incoming")).toHaveLength(0);
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)).toBeUndefined();
  });

  it("should not tell anyone to refresh history when the call record cannot be written", async () => {
    const callId = await inviteAndAccept();
    jest.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    await signal("tutor", tutorId, { type: "call_hangup", callId });

    expect(messagesOfType("call_ended")).toHaveLength(1);
    expect(messagesOfType("call_history_updated")).toHaveLength(0);
    expect(messagesOfType("call_error")).toHaveLength(0);
  });

  it("should send call_canceled to the callee when the caller drops while ringing", async () => {
    await inviteAndGetCallId();
    expect(callWebSocket.released).toEqual([]);

    await terminateActiveCallForParticipant("tutor", tutorId);

    expect(callWebSocket.released).toEqual([`tutor:${tutorId}`, `student:${studentUserId}`]);

    const canceled = messagesOfType("call_canceled");
    expect(canceled).toHaveLength(1);
    expect(canceled[0].id).toBe(studentUserId);
    expect(canceled[0].message).toMatchObject({ reason: "canceled" });
    expect(messagesOfType("call_ended")).toHaveLength(0);
  });

  it("should send call_ended when a participant drops after media connected", async () => {
    const callId = await inviteAndAccept();
    callRegistry.markConnected(callId);

    await terminateActiveCallForParticipant("student", studentUserId);

    expect(messagesOfType("call_ended")).toHaveLength(1);
    expect(messagesOfType("call_ended")[0].message).toMatchObject({ reason: "peer_disconnected" });
    expect(messagesOfType("call_canceled")).toHaveLength(0);
  });

  it("should send call_ended when a participant drops after accept but before media connected", async () => {
    await inviteAndAccept();

    await terminateActiveCallForParticipant("student", studentUserId);

    const ended = messagesOfType("call_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].id).toBe(tutorId);
    expect(messagesOfType("call_canceled")).toHaveLength(0);
  });

  it("should tell the caller the callee went offline when the callee drops while ringing", async () => {
    await inviteAndGetCallId();

    await terminateActiveCallForParticipant("student", studentUserId);

    const unavailable = messagesOfType("call_unavailable");
    expect(unavailable).toHaveLength(1);
    expect(unavailable[0].id).toBe(tutorId);
    expect(unavailable[0].message).toHaveProperty("callId");
    expect(messagesOfType("call_canceled")).toHaveLength(0);
  });

  it("should tell the peer the call was hung up", async () => {
    const callId = await inviteAndAccept();

    await signal("student", studentUserId, { type: "call_hangup", callId });

    const ended = messagesOfType("call_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].id).toBe(tutorId);
    expect(ended[0].message).toEqual({ type: "call_ended", callId, reason: "hangup" });
  });

  it("should relay that the peer has no camera or microphone when it hangs up for that reason", async () => {
    const callId = await inviteAndAccept();

    await signal("tutor", tutorId, { type: "call_hangup", callId, reason: "media_unavailable" });

    expect(messagesOfType("call_ended")[0]).toMatchObject({
      id: studentUserId,
      message: { reason: "media_unavailable" },
    });
  });

  it("should tell the callee the caller canceled while ringing", async () => {
    const callId = await inviteAndGetCallId();

    await signal("tutor", tutorId, { type: "call_cancel", callId });

    expect(messagesOfType("call_canceled")[0].message).toEqual({
      type: "call_canceled",
      callId,
      reason: "canceled",
    });
  });

  it("should tell both parties to refresh their history after the call record is written", async () => {
    const callId = await inviteAndAccept();
    const before = await prisma.callRecord.count({ where: { tutorId } });

    await signal("tutor", tutorId, { type: "call_hangup", callId });

    const types = sent.map((c) => c.message.type);
    expect(types.indexOf("call_ended")).toBeLessThan(types.indexOf("call_history_updated"));
    expect(messagesOfType("call_history_updated").map((c) => c.id)).toEqual([
      tutorId,
      studentUserId,
    ]);
    expect(await prisma.callRecord.count({ where: { tutorId } })).toBe(before + 1);
  });

  it("should tell the caller to refresh history after an invite to an offline peer", async () => {
    callWebSocket.disconnect("student", studentUserId);

    await invite();

    expect(messagesOfType("call_history_updated").map((c) => c.id)).toContain(tutorId);
  });

  it("should send call_ended to the peer and drop its late ICE while the record is written", async () => {
    const callId = await inviteAndAccept();
    callRegistry.markConnected(callId);

    const hangup = signal("tutor", tutorId, { type: "call_hangup", callId });
    const lateIce = signal("student", studentUserId, {
      type: "webrtc_ice",
      callId,
      candidate: CANDIDATE,
    });
    await Promise.all([hangup, lateIce]);

    const toStudent = sent.filter((c) => c.id === studentUserId).map((c) => c.message.type);
    expect(toStudent[0]).toBe("call_ended");
    expect(messagesOfType("call_error")).toHaveLength(0);
  });

  describe("lesson calls", () => {
    const recordCountOfPair = () => prisma.callRecord.count({ where: { tutorId, studentId } });

    const expectRejected = async (message: string, recordsBefore: number) => {
      expect(messagesOfType("call_error")).toHaveLength(1);
      expect(messagesOfType("call_error")[0].message).toMatchObject({
        message,
        inviteId: "invite-1",
      });
      expect(messagesOfType("call_incoming")).toHaveLength(0);
      expect(messagesOfType("call_ringing")).toHaveLength(0);
      expect(await recordCountOfPair()).toBe(recordsBefore);
    };

    it("should ring the student with the lesson when the tutor calls from the lesson", async () => {
      const lesson = await createLesson({ tutorId, studentId });

      await signal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-1",
        targetStudentId: studentId,
        lessonId: lesson.id,
      });

      expect(messagesOfType("call_ringing")[0]).toMatchObject({ id: tutorId });
      expect(messagesOfType("call_incoming")[0]).toMatchObject({
        id: studentUserId,
        message: {
          callerName: "Анна",
          lesson: {
            id: lesson.id,
            subject: "MATHEMATICS",
            startTime: lesson.startTime.toISOString(),
            endTime: lesson.endTime.toISOString(),
          },
        },
      });
      expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)?.lesson?.id).toBe(
        lesson.id
      );
    });

    it("should ring the tutor with the lesson when the student calls from the lesson", async () => {
      const lesson = await createLesson({ tutorId, studentId });

      await signal("student", studentUserId, {
        type: "call_invite",
        inviteId: "invite-1",
        lessonId: lesson.id,
      });

      expect(messagesOfType("call_ringing")[0]).toMatchObject({ id: studentUserId });
      expect(messagesOfType("call_incoming")[0]).toMatchObject({
        id: tutorId,
        message: { callerName: "Иван", lesson: { id: lesson.id } },
      });
    });

    it("should reject a student invite without a lesson before any database lookup", async () => {
      const before = await recordCountOfPair();
      const findStudentUser = jest.spyOn(prisma.studentUser, "findUnique");

      await signal("student", studentUserId, { type: "call_invite", inviteId: "invite-1" });

      expect(findStudentUser).not.toHaveBeenCalled();
      await expectRejected("Звонок возможен только по уроку", before);
    });

    it("should reject a tutor call with a lesson of another student", async () => {
      const other = await createLinkedStudent();
      const lesson = await createLesson({ tutorId, studentId: other.studentId });
      const before = await recordCountOfPair();

      await signal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-1",
        targetStudentId: studentId,
        lessonId: lesson.id,
      });

      await expectRejected("Урок не найден", before);
    });

    it("should reject a tutor call with a deleted lesson", async () => {
      const lesson = await createLesson({ tutorId, studentId });
      await prisma.lesson.delete({ where: { id: lesson.id } });
      const before = await recordCountOfPair();

      await signal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-1",
        targetStudentId: studentId,
        lessonId: lesson.id,
      });

      await expectRejected("Урок не найден", before);
    });

    it("should reject a student call with a lesson of another student", async () => {
      const other = await createLinkedStudent();
      const lesson = await createLesson({ tutorId, studentId: other.studentId });
      const before = await recordCountOfPair();

      await signal("student", studentUserId, {
        type: "call_invite",
        inviteId: "invite-1",
        lessonId: lesson.id,
      });

      await expectRejected("Урок не найден", before);
    });

    it("should reject a student call with a lesson of another tutor", async () => {
      const foreignStudent = await prisma.student.create({
        data: { name: "Чужой ученик", tutorId: otherTutorId },
      });
      const lesson = await createLesson({ tutorId: otherTutorId, studentId: foreignStudent.id });
      const before = await recordCountOfPair();

      await signal("student", studentUserId, {
        type: "call_invite",
        inviteId: "invite-1",
        lessonId: lesson.id,
      });

      await expectRejected("Урок не найден", before);
    });

    it("should reject a student call with a deleted lesson", async () => {
      const lesson = await createLesson({ tutorId, studentId });
      await prisma.lesson.delete({ where: { id: lesson.id } });
      const before = await recordCountOfPair();

      await signal("student", studentUserId, {
        type: "call_invite",
        inviteId: "invite-1",
        lessonId: lesson.id,
      });

      await expectRejected("Урок не найден", before);
    });

    it("should carry the new lesson when a repeated invite replaces the ringing call", async () => {
      const first = await createLesson({ tutorId, studentId });
      const second = await createLesson({ tutorId, studentId });
      await signal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-1",
        targetStudentId: studentId,
        lessonId: first.id,
      });
      callWebSocket.clearSent();

      await signal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-2",
        targetStudentId: studentId,
        lessonId: second.id,
      });

      expect(messagesOfType("call_incoming")[0].message).toMatchObject({
        lesson: { id: second.id },
      });
      await waitFor(() => messagesOfType("call_history_updated").length === 2);
      const canceled = await prisma.callRecord.findFirstOrThrow({
        where: { tutorId, status: "CANCELED", lessonId: first.id },
      });
      expect(canceled.lessonId).toBe(first.id);
    });
  });
});
