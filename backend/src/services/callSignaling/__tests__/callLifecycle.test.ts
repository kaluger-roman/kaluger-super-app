import { callWebSocket, uniqueEmail } from "../../../__tests__/helpers";

import { prisma } from "../../../lib/prisma";
import { handleCallSignal } from "../../../lib/websocket/signaling";

jest.mock(
  "../../../lib/wsManager",
  () => jest.requireActual("../../../__tests__/helpers").callWebSocketManagerModule
);

describe("call lifecycle → call_records persistence", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;
  const sent = () => callWebSocket.sent.map((captured) => captured.message);

  const inviteByTutor = async (): Promise<string> => {
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    const ringing = sent().find((m) => m.type === "call_ringing");
    if (!ringing || ringing.type !== "call_ringing") throw new Error("no ringing");
    return ringing.callId;
  };

  const latestRecord = () =>
    prisma.callRecord.findFirstOrThrow({
      where: { tutorId },
      orderBy: { createdAt: "desc" },
    });

  beforeAll(async () => {
    const tutor = await prisma.user.create({
      data: {
        email: uniqueEmail().toLowerCase(),
        password: "hash",
        name: "Анна",
      },
    });
    tutorId = tutor.id;
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

  afterEach(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
    await prisma.$disconnect();
  });

  it("should write a COMPLETED record after connect → hangup", async () => {
    const callId = await inviteByTutor();
    await handleCallSignal("student", studentUserId, { type: "call_accept", callId });
    await handleCallSignal("tutor", tutorId, { type: "call_connected", callId });
    expect(callWebSocket.released).toEqual([]);
    await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId });

    const record = await latestRecord();
    expect(callWebSocket.released).toEqual([`tutor:${tutorId}`, `student:${studentUserId}`]);
    expect(record.status).toBe("COMPLETED");
    expect(record.callerKind).toBe("TUTOR");
    expect(record.endedAt).not.toBeNull();
    expect(record.durationSeconds).not.toBeNull();
  });

  it("should write a REJECTED record when the callee rejects", async () => {
    const callId = await inviteByTutor();
    await handleCallSignal("student", studentUserId, { type: "call_reject", callId });

    const record = await latestRecord();
    expect(callWebSocket.released).toEqual([`tutor:${tutorId}`, `student:${studentUserId}`]);
    expect(record.status).toBe("REJECTED");
    expect(record.durationSeconds).toBeNull();
    expect(sent().some((m) => m.type === "call_rejected")).toBe(true);
  });

  it("should write a CANCELED record when the caller cancels before answer", async () => {
    const callId = await inviteByTutor();
    await handleCallSignal("tutor", tutorId, { type: "call_cancel", callId });

    const record = await latestRecord();
    expect(callWebSocket.released).toEqual([`tutor:${tutorId}`, `student:${studentUserId}`]);
    expect(record.status).toBe("CANCELED");
    expect(sent().some((m) => m.type === "call_canceled")).toBe(true);
  });

  it("should write a FAILED record when hanging up before media connected", async () => {
    const callId = await inviteByTutor();
    await handleCallSignal("student", studentUserId, { type: "call_accept", callId });
    await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId });

    const record = await latestRecord();
    expect(record.status).toBe("FAILED");
    expect(record.durationSeconds).toBeNull();
  });

  it("should answer call_unavailable and write a MISSED record when the callee is offline", async () => {
    callWebSocket.disconnect("student", studentUserId);
    await handleCallSignal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });

    expect(sent().some((m) => m.type === "call_unavailable")).toBe(true);
    const records = await prisma.callRecord.findMany({ where: { tutorId } });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      status: "MISSED",
      callerKind: "TUTOR",
      durationSeconds: null,
    });
  });
});
