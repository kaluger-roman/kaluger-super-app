import { faker } from "@faker-js/faker";

import prisma from "../../../lib/prisma";
import { handleCallSignal } from "../../../lib/websocket/signaling";
import { callRegistry } from "../index";
import type { CallerKindValue, CallSignalingOutbound } from "../../../types";

const onlineUsers = new Set<string>();
const onlineStudents = new Set<string>();

jest.mock("../../../lib/wsManager", () => ({
  getWebSocketManager: () => ({
    getConnectedUsers: () => Array.from(onlineUsers),
    getConnectedStudents: () => Array.from(onlineStudents),
    sendToUser: jest.fn(),
    sendToStudent: jest.fn(),
  }),
}));

describe("call lifecycle → call_records persistence", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;
  let sent: CallSignalingOutbound[];

  const send = (
    _kind: CallerKindValue,
    _id: string,
    message: CallSignalingOutbound
  ): void => {
    sent.push(message);
  };

  const inviteByTutor = async (): Promise<string> => {
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );
    const ringing = sent.find((m) => m.type === "call_ringing");
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
        email: faker.internet.email().toLowerCase(),
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

  afterEach(async () => {
    callRegistry.__resetLiveCallsForTest();
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
    await handleCallSignal("student", studentUserId, { type: "call_accept", callId }, send);
    await handleCallSignal("tutor", tutorId, { type: "call_connected", callId }, send);
    await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId }, send);

    const record = await latestRecord();
    expect(record.status).toBe("COMPLETED");
    expect(record.callerKind).toBe("TUTOR");
    expect(record.endedAt).not.toBeNull();
    expect(record.durationSeconds).not.toBeNull();
  });

  it("should write a REJECTED record when the callee rejects", async () => {
    const callId = await inviteByTutor();
    await handleCallSignal("student", studentUserId, { type: "call_reject", callId }, send);

    const record = await latestRecord();
    expect(record.status).toBe("REJECTED");
    expect(record.durationSeconds).toBeNull();
    expect(sent.some((m) => m.type === "call_rejected")).toBe(true);
  });

  it("should write a CANCELED record when the caller cancels before answer", async () => {
    const callId = await inviteByTutor();
    await handleCallSignal("tutor", tutorId, { type: "call_cancel", callId }, send);

    const record = await latestRecord();
    expect(record.status).toBe("CANCELED");
    expect(sent.some((m) => m.type === "call_canceled")).toBe(true);
  });

  it("should write a FAILED record when hanging up before media connected", async () => {
    const callId = await inviteByTutor();
    await handleCallSignal("student", studentUserId, { type: "call_accept", callId }, send);
    await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId }, send);

    const record = await latestRecord();
    expect(record.status).toBe("FAILED");
    expect(record.durationSeconds).toBeNull();
  });

  it("should answer call_unavailable and write no record when the callee is offline", async () => {
    onlineStudents.clear();
    await handleCallSignal(
      "tutor",
      tutorId,
      { type: "call_invite", targetStudentId: studentId },
      send
    );

    expect(sent.some((m) => m.type === "call_unavailable")).toBe(true);
    const count = await prisma.callRecord.count({ where: { tutorId } });
    expect(count).toBe(0);
  });
});
