import { uniqueEmail } from "../../../__tests__/helpers";

import { prisma } from "../../prisma";
import {
  __resetInviteRateLimitForTest,
  callRegistry,
  INVITE_RATE_LIMIT,
} from "../../../services/callSignaling";
import type { CallerKindValue, CallSignalingOutbound } from "../../../types";
import { handleCallSignal, onRingTimeout, terminateActiveCallForParticipant } from "../signaling";
import { SDP_MAX_LENGTH } from "../signaling.constants";

const OFFER = { type: "offer", sdp: "v=0 offer" };
const ANSWER = { type: "answer", sdp: "v=0 answer" };
const CANDIDATE = {
  candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ host",
  sdpMid: "0",
  sdpMLineIndex: 0,
};

const onlineUsers = new Set<string>();
const onlineStudents = new Set<string>();

jest.mock("../../wsManager", () => ({
  getWebSocketManager: () => ({
    getConnectedUsers: () => Array.from(onlineUsers),
    getConnectedStudents: () => Array.from(onlineStudents),
    sendToUser: jest.fn(),
    sendToStudent: jest.fn(),
  }),
}));

type Captured = {
  kind: CallerKindValue;
  id: string;
  message: CallSignalingOutbound;
};

describe("handleCallSignal routing", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;
  let otherTutorId: string;
  let sent: Captured[];
  const extraStudentIds: string[] = [];
  const extraStudentUserIds: string[] = [];

  const send = (kind: CallerKindValue, id: string, message: CallSignalingOutbound): void => {
    sent.push({ kind, id, message });
  };

  const messagesOfType = (type: string): Captured[] => sent.filter((c) => c.message.type === type);

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
    sent = [];
    callRegistry.__resetLiveCallsForTest();
    __resetInviteRateLimitForTest();
    onlineUsers.clear();
    onlineStudents.clear();
    onlineUsers.add(tutorId);
    onlineStudents.add(studentUserId);
  });

  afterAll(async () => {
    callRegistry.__resetLiveCallsForTest();
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
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );

    const incoming = messagesOfType("call_incoming");
    const ringing = messagesOfType("call_ringing");
    expect(incoming).toHaveLength(1);
    expect(incoming[0].id).toBe(studentUserId);
    expect(incoming[0].message).toMatchObject({ callerName: "Анна" });
    expect(incoming[0].message).toHaveProperty("iceServers");
    expect(ringing).toHaveLength(1);
    expect(ringing[0].id).toBe(tutorId);
    expect(ringing[0].message).toHaveProperty("iceServers");
  });

  it("should answer call_unavailable when the callee is offline", async () => {
    onlineStudents.clear();
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    expect(messagesOfType("call_unavailable")).toHaveLength(1);
    expect(messagesOfType("call_incoming")).toHaveLength(0);
  });

  it("should not start a call when the caller went offline while the pair was resolved", async () => {
    onlineUsers.delete(tutorId);

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );

    expect(sent).toHaveLength(0);
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)).toBeUndefined();
  });

  it("should answer call_busy when the callee already has an active call", async () => {
    const pair = await resolvePair();
    callRegistry.startCall(pair, "student", () => undefined);

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    expect(messagesOfType("call_busy")).toHaveLength(1);
  });

  it("should re-send call_ringing with the same callId when the caller repeats an invite", async () => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    const firstRinging = messagesOfType("call_ringing")[0].message;
    sent = [];
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    expect(messagesOfType("call_incoming")).toHaveLength(0);
    const ringing = messagesOfType("call_ringing");
    expect(ringing).toHaveLength(1);
    expect(ringing[0].message).toMatchObject({
      callId: (firstRinging as { callId: string }).callId,
    });
  });

  it("should relay sanitized offer/answer/ice to the peer after the callee accepts", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("tutor", tutorId, { type: "webrtc_offer", callId, sdp: OFFER }, send);
    await handleCallSignal(
      "student",
      studentUserId,
      { type: "webrtc_answer", callId, sdp: ANSWER },
      send
    );
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "webrtc_ice", callId, candidate: { ...CANDIDATE, extra: "dropped" } },
      send
    );

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

    await handleCallSignal(
      "student",
      studentUserId,
      {
        type: "call_media_state",
        callId,
        micOn: true,
        cameraOn: false,
        screenSharing: false,
        cameraAvailable: false,
      },
      send
    );

    const media = messagesOfType("call_media_state");
    expect(media).toHaveLength(1);
    expect(media[0].id).toBe(tutorId);
    expect(media[0].message).toMatchObject({ cameraOn: false, cameraAvailable: false });
  });

  it("should reject signaling for a callId the sender is not part of", async () => {
    const callId = await inviteAndAccept();
    await handleCallSignal(
      "tutor",
      otherTutorId,
      { type: "webrtc_offer", callId, sdp: OFFER },
      send
    );
    expect(messagesOfType("call_error")).toHaveLength(1);
    expect(messagesOfType("call_error")[0].message).toMatchObject({ callId });
    expect(messagesOfType("webrtc_offer")).toHaveLength(0);
  });

  it("should not relay offers, ICE or media state while the call is still ringing", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("tutor", tutorId, { type: "webrtc_offer", callId, sdp: OFFER }, send);
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "webrtc_ice", callId, candidate: CANDIDATE },
      send
    );
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_media_state", callId, micOn: true, cameraOn: true, screenSharing: false },
      send
    );

    expect(sent).toHaveLength(0);
  });

  it("should ignore call_accept and call_reject sent by the caller", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("tutor", tutorId, { type: "call_accept", callId }, send);
    await handleCallSignal("tutor", tutorId, { type: "call_reject", callId }, send);

    expect(sent).toHaveLength(0);
    expect(callRegistry.getCall(callId)?.status).toBe("ringing");
  });

  it("should ignore call_cancel sent by the callee", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("student", studentUserId, { type: "call_cancel", callId }, send);

    expect(sent).toHaveLength(0);
    expect(callRegistry.getCall(callId)).toBeDefined();
  });

  it("should end the call with call_ended when the caller cancels after the callee accepted", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("tutor", tutorId, { type: "call_cancel", callId }, send);

    const ended = messagesOfType("call_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].id).toBe(studentUserId);
    expect(callRegistry.getCall(callId)).toBeUndefined();
  });

  it("should not mark the call connected before the callee accepts", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("tutor", tutorId, { type: "call_connected", callId }, send);

    expect(callRegistry.getCall(callId)?.connectedAt).toBeUndefined();
  });

  it("should answer call_error when the caller already has a call with another student", async () => {
    await inviteAndGetCallId();
    const other = await createLinkedStudent();
    onlineStudents.add(other.studentUserId);

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: other.studentId },
      send
    );

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Сначала завершите текущий звонок",
    });
    expect(messagesOfType("call_incoming")).toHaveLength(0);
  });

  it("should answer call_error when a sender exceeds the invite rate limit", async () => {
    for (let attempt = 0; attempt < INVITE_RATE_LIMIT; attempt += 1) {
      await handleCallSignal(
        "tutor",
        tutorId,
        { type: "call_invite", targetStudentId: studentId },
        send
      );
    }
    sent = [];

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Слишком много звонков. Попробуйте через минуту",
    });
    expect(messagesOfType("call_ringing")).toHaveLength(0);
  });

  it("should ignore an invite whose targetStudentId is not a string", async () => {
    await handleCallSignal("tutor", tutorId, { type: "call_invite", targetStudentId: 42 }, send);

    expect(sent).toHaveLength(0);
  });

  it("should drop offers with a malformed or oversized sdp", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "webrtc_offer", callId, sdp: { type: "offer", sdp: 1 } },
      send
    );
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "webrtc_offer", callId, sdp: { type: "pranswer", sdp: "v=0" } },
      send
    );
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "webrtc_offer", callId, sdp: { type: "offer", sdp: "v".repeat(SDP_MAX_LENGTH + 1) } },
      send
    );

    expect(sent).toHaveLength(0);
  });

  it("should answer call_error when the tutor calls an archived student", async () => {
    await prisma.student.update({ where: { id: studentId }, data: { archived: true } });
    try {
      await handleCallSignal(
        "tutor",
        tutorId,
        { type: "call_invite", targetStudentId: studentId },
        send
      );
    } finally {
      await prisma.student.update({ where: { id: studentId }, data: { archived: false } });
    }

    expect(messagesOfType("call_error")[0].message).toMatchObject({
      message: "Звонки недоступны: ученик в архиве",
    });
    expect(messagesOfType("call_incoming")).toHaveLength(0);
  });

  it("should send call_no_answer to the caller and call_canceled to the callee when ringing times out", async () => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    const call = callRegistry.findActiveCallForParticipant("tutor", tutorId);
    expect(call).toBeDefined();
    sent = [];

    await onRingTimeout(call!, send);

    const noAnswer = messagesOfType("call_no_answer");
    expect(noAnswer).toHaveLength(1);
    expect(noAnswer[0].id).toBe(tutorId);
    const canceled = messagesOfType("call_canceled");
    expect(canceled).toHaveLength(1);
    expect(canceled[0].id).toBe(studentUserId);
    expect(canceled[0].message).toMatchObject({ reason: "timeout" });
    expect(callRegistry.findActiveCallForParticipant("tutor", tutorId)).toBeUndefined();
  });

  it("should send call_canceled to the callee when the caller drops while ringing", async () => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    sent = [];

    await terminateActiveCallForParticipant("tutor", tutorId, send);

    const canceled = messagesOfType("call_canceled");
    expect(canceled).toHaveLength(1);
    expect(canceled[0].id).toBe(studentUserId);
    expect(canceled[0].message).toMatchObject({ reason: "canceled" });
    expect(messagesOfType("call_ended")).toHaveLength(0);
  });

  it("should send call_ended when a participant drops after media connected", async () => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    const call = callRegistry.findActiveCallForParticipant("tutor", tutorId);
    expect(call).toBeDefined();
    callRegistry.markAccepted(call!.callId);
    callRegistry.markConnected(call!.callId);
    sent = [];

    await terminateActiveCallForParticipant("student", studentUserId, send);

    expect(messagesOfType("call_ended")).toHaveLength(1);
    expect(messagesOfType("call_ended")[0].message).toMatchObject({ reason: "peer_disconnected" });
    expect(messagesOfType("call_canceled")).toHaveLength(0);
  });

  it("should send call_ended when a participant drops after accept but before media connected", async () => {
    await inviteAndAccept();

    await terminateActiveCallForParticipant("student", studentUserId, send);

    const ended = messagesOfType("call_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].id).toBe(tutorId);
    expect(messagesOfType("call_canceled")).toHaveLength(0);
  });

  it("should tell the caller the callee went offline when the callee drops while ringing", async () => {
    await inviteAndGetCallId();

    await terminateActiveCallForParticipant("student", studentUserId, send);

    const unavailable = messagesOfType("call_unavailable");
    expect(unavailable).toHaveLength(1);
    expect(unavailable[0].id).toBe(tutorId);
    expect(messagesOfType("call_canceled")).toHaveLength(0);
  });

  it("should ignore malformed signaling without relaying or answering call_error", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal("tutor", tutorId, { type: "webrtc_offer", callId }, send);
    expect(messagesOfType("webrtc_offer")).toHaveLength(0);

    await handleCallSignal("student", studentUserId, { type: "ping" }, send);
    expect(messagesOfType("call_error")).toHaveLength(0);
  });

  it("should tell the peer the call was hung up", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("student", studentUserId, { type: "call_hangup", callId }, send);

    const ended = messagesOfType("call_ended");
    expect(ended).toHaveLength(1);
    expect(ended[0].id).toBe(tutorId);
    expect(ended[0].message).toEqual({ type: "call_ended", callId, reason: "hangup" });
  });

  it("should relay that the peer has no camera or microphone when it hangs up for that reason", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_hangup", callId, reason: "media_unavailable" },
      send
    );

    expect(messagesOfType("call_ended")[0]).toMatchObject({
      id: studentUserId,
      message: { reason: "media_unavailable" },
    });
  });

  it("should tell the callee the caller canceled while ringing", async () => {
    const callId = await inviteAndGetCallId();
    sent = [];

    await handleCallSignal("tutor", tutorId, { type: "call_cancel", callId }, send);

    expect(messagesOfType("call_canceled")[0].message).toEqual({
      type: "call_canceled",
      callId,
      reason: "canceled",
    });
  });

  it("should tell both parties to refresh their history after the call record is written", async () => {
    const callId = await inviteAndAccept();
    const before = await prisma.callRecord.count({ where: { tutorId } });

    await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId }, send);

    const types = sent.map((c) => c.message.type);
    expect(types.indexOf("call_ended")).toBeLessThan(types.indexOf("call_history_updated"));
    expect(messagesOfType("call_history_updated").map((c) => c.id)).toEqual([
      tutorId,
      studentUserId,
    ]);
    expect(await prisma.callRecord.count({ where: { tutorId } })).toBe(before + 1);
  });

  it("should tell the caller to refresh history after an invite to an offline peer", async () => {
    onlineStudents.clear();

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );

    expect(messagesOfType("call_history_updated").map((c) => c.id)).toContain(tutorId);
  });

  it("should send call_ended to the peer before the call record is written", async () => {
    const callId = await inviteAndAccept();
    callRegistry.markConnected(callId);
    sent = [];

    const hangup = handleCallSignal("tutor", tutorId, { type: "call_hangup", callId }, send);
    const lateIce = handleCallSignal(
      "student",
      studentUserId,
      { type: "webrtc_ice", callId, candidate: CANDIDATE },
      send
    );
    await Promise.all([hangup, lateIce]);

    const toStudent = sent.filter((c) => c.id === studentUserId).map((c) => c.message.type);
    expect(toStudent[0]).toBe("call_ended");
  });

  it("should ignore a call_hangup for an unknown call without call_error", async () => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_hangup", callId: "does-not-exist" },
      send
    );
    expect(messagesOfType("call_error")).toHaveLength(0);
    expect(messagesOfType("call_ended")).toHaveLength(0);
  });

  const resolvePair = async () => {
    const { resolvePairForTutor } = await import("../../../services/callSignaling");
    return resolvePairForTutor(tutorId, studentId);
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

  const inviteAndAccept = async (): Promise<string> => {
    const callId = await inviteAndGetCallId();
    await handleCallSignal("student", studentUserId, { type: "call_accept", callId }, send);
    sent = [];
    return callId;
  };

  const inviteAndGetCallId = async (): Promise<string> => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    const ringing = messagesOfType("call_ringing")[0].message;
    if (ringing.type !== "call_ringing") throw new Error("no ringing");
    sent = [];
    return ringing.callId;
  };
});
