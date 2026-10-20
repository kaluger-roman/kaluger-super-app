import { callWebSocket, uniqueEmail } from "../../../__tests__/helpers";

import { prisma } from "../../prisma";
import { handleCallSignal, routeCallMessage } from "../signaling";
import { SDP_MAX_LENGTH } from "../signaling.constants";

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

// The call flow itself is covered in services/callSignaling; this suite checks that raw socket
// messages are parsed and sanitized before they reach it.
describe("handleCallSignal parsing", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: { email: uniqueEmail().toLowerCase(), password: "hash", name: "Анна" },
    });
    tutorId = tutor.id;
    const student = await prisma.student.create({ data: { name: "Иван", tutorId } });
    studentId = student.id;
    const studentUser = await prisma.studentUser.create({
      data: { email: uniqueEmail().toLowerCase(), password: "hash", name: "Иван", studentId },
    });
    studentUserId = studentUser.id;
  });

  beforeEach(() => {
    callWebSocket.reset();
    callWebSocket.connect("tutor", tutorId);
    callWebSocket.connect("student", studentUserId);
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
    await prisma.$disconnect();
  });

  const inviteAndAccept = async (): Promise<string> => {
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    const ringing = messagesOfType("call_ringing")[0].message;
    if (ringing.type !== "call_ringing") throw new Error("no ringing");
    await handleCallSignal("student", studentUserId, {
      type: "call_accept",
      callId: ringing.callId,
    });
    callWebSocket.clearSent();
    return ringing.callId;
  };

  it("should relay only the known ICE candidate fields", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("tutor", tutorId, {
      type: "webrtc_ice",
      callId,
      candidate: { ...CANDIDATE, extra: "dropped" },
    });

    expect(messagesOfType("webrtc_ice")[0].message).toEqual({
      type: "webrtc_ice",
      callId,
      candidate: { ...CANDIDATE, usernameFragment: null },
    });
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

  it("should ignore malformed signaling without relaying or answering call_error", async () => {
    const callId = await inviteAndAccept();

    await handleCallSignal("tutor", tutorId, { type: "webrtc_offer", callId });
    await handleCallSignal("student", studentUserId, { type: "ping" });

    expect(sent).toHaveLength(0);
  });

  it("should claim call signals and leave other messages to the caller", () => {
    expect(routeCallMessage("tutor", tutorId, { type: "lesson_status_updated" })).toBe(false);
    expect(routeCallMessage("tutor", tutorId, { type: "call_hangup", callId: "gone" })).toBe(true);
  });
});
