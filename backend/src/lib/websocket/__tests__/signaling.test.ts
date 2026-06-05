import { faker } from "@faker-js/faker";

import prisma from "../../prisma";
import * as callSignalingService from "../../../services/callSignaling";
import { callRegistry } from "../../../services/callSignaling";
import type { CallerKindValue, CallSignalingOutbound } from "../../../types";
import {
  handleCallSignal,
  onRingTimeout,
  terminateActiveCallForParticipant,
} from "../signaling";

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

  const send = (
    kind: CallerKindValue,
    id: string,
    message: CallSignalingOutbound
  ): void => {
    sent.push({ kind, id, message });
  };

  const messagesOfType = (type: string): Captured[] =>
    sent.filter((c) => c.message.type === type);

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: "hash",
        name: "Анна",
      },
    });
    tutorId = tutor.id;
    const otherTutor = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
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
        email: faker.internet.email().toLowerCase(),
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
    onlineUsers.clear();
    onlineStudents.clear();
    onlineUsers.add(tutorId);
    onlineStudents.add(studentUserId);
  });

  afterAll(async () => {
    callRegistry.__resetLiveCallsForTest();
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
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

  it("should dedup repeat invites from the same caller to the same peer", async () => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    sent = [];
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    expect(messagesOfType("call_incoming")).toHaveLength(0);
    expect(messagesOfType("call_ringing")).toHaveLength(0);
  });

  it("should short-circuit a repeat invite without re-resolving the pair from the DB", async () => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    sent = [];

    const resolveSpy = jest.spyOn(callSignalingService, "resolvePairForTutor");
    try {
      await handleCallSignal(
        "tutor",
        tutorId,
        { type: "call_invite", targetStudentId: studentId },
        send
      );

      expect(resolveSpy).not.toHaveBeenCalled();
      expect(messagesOfType("call_incoming")).toHaveLength(0);
    } finally {
      resolveSpy.mockRestore();
    }
  });

  it("should relay offer/answer/ice verbatim to the peer", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "webrtc_offer", callId, sdp: { kind: "offer" } },
      send
    );
    await handleCallSignal(
      "student",
      studentUserId,
      { type: "webrtc_answer", callId, sdp: { kind: "answer" } },
      send
    );
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "webrtc_ice", callId, candidate: { c: 1 } },
      send
    );

    const offer = messagesOfType("webrtc_offer")[0];
    expect(offer.id).toBe(studentUserId);
    expect(offer.message).toMatchObject({ sdp: { kind: "offer" } });
    const answer = messagesOfType("webrtc_answer")[0];
    expect(answer.id).toBe(tutorId);
    expect(answer.message).toMatchObject({ sdp: { kind: "answer" } });
    const ice = messagesOfType("webrtc_ice")[0];
    expect(ice.id).toBe(studentUserId);
    expect(ice.message).toMatchObject({ candidate: { c: 1 } });
  });

  it("should reject signaling for a callId the sender is not part of", async () => {
    const callId = await inviteAndGetCallId();
    sent = [];
    await handleCallSignal(
      "tutor",
      otherTutorId,
      { type: "webrtc_offer", callId, sdp: {} },
      send
    );
    expect(messagesOfType("call_error")).toHaveLength(1);
    expect(messagesOfType("webrtc_offer")).toHaveLength(0);
  });

  it("notifies both the caller (call_no_answer) and the callee (call_canceled) on ring timeout", async () => {
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
    expect(
      callRegistry.findActiveCallForParticipant("tutor", tutorId)
    ).toBeUndefined();
  });

  it("treats a caller drop during ringing as a cancel and closes the callee modal", async () => {
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
    expect(messagesOfType("call_ended")).toHaveLength(0);
  });

  it("treats a drop after connect as a normal end (call_ended)", async () => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    const call = callRegistry.findActiveCallForParticipant("tutor", tutorId);
    expect(call).toBeDefined();
    callRegistry.markConnected(call!.callId);
    sent = [];

    await terminateActiveCallForParticipant("student", studentUserId, send);

    expect(messagesOfType("call_ended")).toHaveLength(1);
    expect(messagesOfType("call_canceled")).toHaveLength(0);
  });

  it("ignores malformed signaling without relaying or sending call_error", async () => {
    const callId = await inviteAndGetCallId();

    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "webrtc_offer", callId },
      send
    );
    expect(messagesOfType("webrtc_offer")).toHaveLength(0);

    await handleCallSignal("student", studentUserId, { type: "ping" }, send);
    expect(messagesOfType("call_error")).toHaveLength(0);
  });

  it("ignores a call_hangup for an unknown call (idempotent, no call_error)", async () => {
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
    const { resolvePairForTutor } = await import(
      "../../../services/callSignaling"
    );
    return resolvePairForTutor(tutorId, studentId);
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
