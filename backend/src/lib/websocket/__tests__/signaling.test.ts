import { callWebSocket, uniqueEmail } from "../../../__tests__/helpers";

import { prisma } from "../../prisma";
import {
  INVITE_RATE_LIMIT,
  terminateActiveCallForParticipant,
} from "../../../services/callSignaling";
import * as callRegistry from "../../../services/callSignaling/callSignaling";
import { RING_TIMEOUT_MS } from "../../../services/callSignaling/callSignaling.constants";
import { resolvePairForTutor } from "../../../services/callSignaling/callSignaling.helpers";
import { handleCallSignal } from "../signaling";
import { SDP_MAX_LENGTH } from "../signaling.constants";

const OFFER = { type: "offer", sdp: "v=0 offer" };
const ANSWER = { type: "answer", sdp: "v=0 answer" };
const CANDIDATE = {
  candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ host",
  sdpMid: "0",
  sdpMLineIndex: 0,
};

jest.mock(
  "../../wsManager",
  () => jest.requireActual("../../../__tests__/helpers").callWebSocketManagerModule
);

const { sent, messagesOfType } = callWebSocket;

describe("handleCallSignal routing", () => {
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
    await prisma.studentUser.deleteMany({
      where: { id: { in: [studentUserId, ...extraStudentUserIds] } },
    });
    await prisma.student.deleteMany({ where: { id: { in: [studentId, ...extraStudentIds] } } });
    await prisma.user.deleteMany({
      where: { id: { in: [tutorId, otherTutorId] } },
    });
    await prisma.$disconnect();
  });

  it("should send call_incoming to the callee and call_ringing to the caller on a valid invite", async () => {
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });

    const incoming = messagesOfType("call_incoming");
    const ringing = messagesOfType("call_ringing");
    expect(incoming).toHaveLength(1);
    expect(incoming[0].id).toBe(studentUserId);
    expect(incoming[0].message).toMatchObject({ callerName: "Анна" });
    expect(incoming[0].message).toHaveProperty("iceServers");
    expect(ringing).toHaveLength(1);
    expect(ringing[0].id).toBe(tutorId);
    expect(ringing[0].message).not.toHaveProperty("iceServers");
    expect(ringing[0].message).toMatchObject({ inviteId: "invite-1" });
  });

  it("should answer call_unavailable when the callee is offline", async () => {
    callWebSocket.disconnect("student", studentUserId);
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    expect(messagesOfType("call_unavailable")).toHaveLength(1);
    expect(messagesOfType("call_unavailable")[0].message).toMatchObject({ inviteId: "invite-1" });
    expect(messagesOfType("call_incoming")).toHaveLength(0);
  });

  it("should not start a call when the caller went offline while the pair was resolved", async () => {
    callWebSocket.disconnect("tutor", tutorId);

    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });

    expect(sent).toHaveLength(0);
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)).toBeUndefined();
  });

  it("should answer call_busy when the callee already has an active call", async () => {
    const pair = await resolvePair();
    callRegistry.startCall(pair, "student", () => undefined);

    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    expect(messagesOfType("call_busy")).toHaveLength(1);
    expect(messagesOfType("call_busy")[0].message).toEqual({
      type: "call_busy",
      inviteId: "invite-1",
    });
  });

  it("should re-send call_ringing with the same callId when the caller repeats an invite", async () => {
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    const firstRinging = messagesOfType("call_ringing")[0].message;
    callWebSocket.clearSent();
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    expect(messagesOfType("call_incoming")).toHaveLength(0);
    const ringing = messagesOfType("call_ringing");
    expect(ringing).toHaveLength(1);
    expect(ringing[0].message).toMatchObject({
      callId: (firstRinging as { callId: string }).callId,
    });
  });

  it("should relay sanitized offer/answer/ice to the peer after the callee accepts", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("tutor", tutorId, { type: "webrtc_offer", callId, sdp: OFFER });
    await handleCallSignal("student", studentUserId, {
      type: "webrtc_answer",
      callId,
      sdp: ANSWER,
    });
    await handleCallSignal("tutor", tutorId, {
      type: "webrtc_ice",
      callId,
      candidate: { ...CANDIDATE, extra: "dropped" },
    });

    const offer = messagesOfType("webrtc_offer")[0];
    expect(offer.id).toBe(studentUserId);
    expect(offer.message).toMatchObject({ sdp: OFFER });
    const answer = messagesOfType("webrtc_answer")[0];
    expect(answer.id).toBe(tutorId);
    expect(answer.message).toMatchObject({ sdp: ANSWER });
    const ice = messagesOfType("webrtc_ice")[0];
    expect(ice.id).toBe(studentUserId);
    expect(ice.message).toEqual({
      type: "webrtc_ice",
      callId,
      candidate: { ...CANDIDATE, usernameFragment: null },
    });
  });

  it("should relay call_media_state with cameraAvailable after the callee accepts", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("student", studentUserId, {
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

  it("should reject signaling for a callId the sender is not part of", async () => {
    const callId = await inviteAndAccept();
    await handleCallSignal("tutor", otherTutorId, { type: "webrtc_offer", callId, sdp: OFFER });
    expect(messagesOfType("call_error")).toHaveLength(1);
    expect(messagesOfType("call_error")[0].message).toMatchObject({ callId });
    expect(messagesOfType("webrtc_offer")).toHaveLength(0);
  });

  it("should not relay offers, ICE or media state while the call is still ringing", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("tutor", tutorId, { type: "webrtc_offer", callId, sdp: OFFER });
    await handleCallSignal("tutor", tutorId, { type: "webrtc_ice", callId, candidate: CANDIDATE });
    await handleCallSignal("tutor", tutorId, {
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

    await handleCallSignal("tutor", tutorId, { type: "call_accept", callId });
    await handleCallSignal("tutor", tutorId, { type: "call_reject", callId });

    expect(sent).toHaveLength(0);
    expect(callRegistry.getCall(callId)?.status).toBe("ringing");
  });

  it("should ignore call_cancel sent by the callee", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("student", studentUserId, { type: "call_cancel", callId });

    expect(sent).toHaveLength(0);
    expect(callRegistry.getCall(callId)).toBeDefined();
  });

  it("should end the call with call_ended when the caller cancels after the callee accepted", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("tutor", tutorId, { type: "call_cancel", callId });

    const ended = messagesOfType("call_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].id).toBe(studentUserId);
    expect(callRegistry.getCall(callId)).toBeUndefined();
  });

  it("should not mark the call connected before the callee accepts", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("tutor", tutorId, { type: "call_connected", callId });

    expect(callRegistry.getCall(callId)?.connectedAt).toBeUndefined();
  });

  it("should answer call_error when the caller already has a call with another student", async () => {
    await inviteAndGetCallId();
    const other = await createLinkedStudent();
    callWebSocket.connect("student", other.studentUserId);

    await handleCallSignal("tutor", tutorId, {
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
      await handleCallSignal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-1",
        targetStudentId: studentId,
      });
    }
    callWebSocket.clearSent();

    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Слишком много звонков. Попробуйте через минуту",
    });
    expect(messagesOfType("call_ringing")).toHaveLength(0);
  });

  it("should ignore an invite whose targetStudentId is not a string", async () => {
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: 42,
    });

    expect(sent).toHaveLength(0);
  });

  it("should drop offers with a malformed or oversized sdp", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("tutor", tutorId, {
      type: "webrtc_offer",
      callId,
      sdp: { type: "offer", sdp: 1 },
    });
    await handleCallSignal("tutor", tutorId, {
      type: "webrtc_offer",
      callId,
      sdp: { type: "pranswer", sdp: "v=0" },
    });
    await handleCallSignal("tutor", tutorId, {
      type: "webrtc_offer",
      callId,
      sdp: { type: "offer", sdp: "v".repeat(SDP_MAX_LENGTH + 1) },
    });

    expect(sent).toHaveLength(0);
  });

  it("should answer call_error when the tutor calls an archived student", async () => {
    await prisma.student.update({ where: { id: studentId }, data: { archived: true } });
    try {
      await handleCallSignal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-1",
        targetStudentId: studentId,
      });
    } finally {
      await prisma.student.update({ where: { id: studentId }, data: { archived: false } });
    }

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Звонки недоступны: ученик в архиве",
    });
    expect(messagesOfType("call_incoming")).toHaveLength(0);
  });

  it("should send call_no_answer to the caller and call_canceled to the callee when ringing times out", async () => {
    const createRecord = jest.spyOn(prisma.callRecord, "create");
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask", "Date"] });
    try {
      await handleCallSignal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-1",
        targetStudentId: studentId,
      });
      callWebSocket.clearSent();

      jest.advanceTimersByTime(RING_TIMEOUT_MS);
    } finally {
      jest.useRealTimers();
    }
    // The record is written after both parties were told; wait for it so it does not leak.
    await createRecord.mock.results[0]?.value;
    await new Promise((resolve) => setImmediate(resolve));

    const noAnswer = messagesOfType("call_no_answer");
    expect(noAnswer).toHaveLength(1);
    expect(noAnswer[0].id).toBe(tutorId);
    const canceled = messagesOfType("call_canceled");
    expect(canceled).toHaveLength(1);
    expect(canceled[0].id).toBe(studentUserId);
    expect(canceled[0].message).toMatchObject({ reason: "timeout" });
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)).toBeUndefined();
    expect(messagesOfType("call_history_updated")).toHaveLength(2);
  });

  it("should answer call_error without a database lookup when a tutor invites nobody", async () => {
    const findStudent = jest.spyOn(prisma.student, "findUnique");

    await handleCallSignal("tutor", tutorId, { type: "call_invite", inviteId: "invite-1" });

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Не выбран ученик для звонка",
    });
    expect(findStudent).not.toHaveBeenCalled();
  });

  it("should not start a call when the caller's socket was replaced while the pair was resolved", async () => {
    const invite = handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    callWebSocket.replaceConnection("tutor", tutorId);
    await invite;

    expect(messagesOfType("call_incoming")).toHaveLength(0);
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)).toBeUndefined();
  });

  it("should not tell anyone to refresh history when the call record cannot be written", async () => {
    const callId = await inviteAndAccept();
    jest.spyOn(prisma.callRecord, "create").mockRejectedValueOnce(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId });

    expect(messagesOfType("call_ended")).toHaveLength(1);
    expect(messagesOfType("call_history_updated")).toHaveLength(0);
    expect(messagesOfType("call_error")).toHaveLength(0);
  });

  it("should send call_canceled to the callee when the caller drops while ringing", async () => {
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    callWebSocket.clearSent();

    await terminateActiveCallForParticipant("tutor", tutorId);

    const canceled = messagesOfType("call_canceled");
    expect(canceled).toHaveLength(1);
    expect(canceled[0].id).toBe(studentUserId);
    expect(canceled[0].message).toMatchObject({ reason: "canceled" });
    expect(messagesOfType("call_ended")).toHaveLength(0);
  });

  it("should send call_ended when a participant drops after media connected", async () => {
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    const call = callRegistry.findActiveCallForParticipant("tutor", tutorId);
    expect(call).toBeDefined();
    callRegistry.markAccepted(call!.callId);
    callRegistry.markConnected(call!.callId);
    callWebSocket.clearSent();

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

  it("should ignore malformed signaling without relaying or answering call_error", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("tutor", tutorId, { type: "webrtc_offer", callId });
    expect(messagesOfType("webrtc_offer")).toHaveLength(0);

    await handleCallSignal("student", studentUserId, { type: "ping" });
    expect(messagesOfType("call_error")).toHaveLength(0);
  });

  it("should tell the peer the call was hung up", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("student", studentUserId, { type: "call_hangup", callId });

    const ended = messagesOfType("call_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].id).toBe(tutorId);
    expect(ended[0].message).toEqual({ type: "call_ended", callId, reason: "hangup" });
  });

  it("should relay that the peer has no camera or microphone when it hangs up for that reason", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("tutor", tutorId, {
      type: "call_hangup",
      callId,
      reason: "media_unavailable",
    });

    expect(messagesOfType("call_ended")[0]).toMatchObject({
      id: studentUserId,
      message: { reason: "media_unavailable" },
    });
  });

  it("should tell the callee the caller canceled while ringing", async () => {
    const callId = await inviteAndGetCallId();
    callWebSocket.clearSent();

    await handleCallSignal("tutor", tutorId, { type: "call_cancel", callId });

    expect(messagesOfType("call_canceled")[0].message).toEqual({
      type: "call_canceled",
      callId,
      reason: "canceled",
    });
  });

  it("should tell both parties to refresh their history after the call record is written", async () => {
    const callId = await inviteAndAccept();
    const before = await prisma.callRecord.count({ where: { tutorId } });

    await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId });

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

    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });

    expect(messagesOfType("call_history_updated").map((c) => c.id)).toContain(tutorId);
  });

  it("should send call_ended to the peer before the call record is written", async () => {
    const callId = await inviteAndAccept();
    callRegistry.markConnected(callId);
    callWebSocket.clearSent();

    const hangup = handleCallSignal("tutor", tutorId, { type: "call_hangup", callId });
    const lateIce = handleCallSignal("student", studentUserId, {
      type: "webrtc_ice",
      callId,
      candidate: CANDIDATE,
    });
    await Promise.all([hangup, lateIce]);

    const toStudent = sent.filter((c) => c.id === studentUserId).map((c) => c.message.type);
    expect(toStudent[0]).toBe("call_ended");
  });

  it("should ignore a call_hangup for an unknown call without call_error", async () => {
    await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId: "does-not-exist" });
    expect(messagesOfType("call_error")).toHaveLength(0);
    expect(messagesOfType("call_ended")).toHaveLength(0);
  });

  const resolvePair = () => resolvePairForTutor(tutorId, studentId);

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

  const inviteAndAccept = async (): Promise<string> => {
    const callId = await inviteAndGetCallId();
    await handleCallSignal("student", studentUserId, { type: "call_accept", callId });
    callWebSocket.clearSent();
    return callId;
  };

  const inviteAndGetCallId = async (): Promise<string> => {
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    const ringing = messagesOfType("call_ringing")[0].message;
    if (ringing.type !== "call_ringing") throw new Error("no ringing");
    callWebSocket.clearSent();
    return ringing.callId;
  };
});
