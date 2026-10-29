import { callWebSocket, uniqueEmail, waitFor } from "../../../__tests__/helpers";

import { prisma } from "../../../lib/prisma";
import { handleCallSignal } from "../../../lib/websocket/signaling";
import { terminateActiveCallForParticipant } from "../callMessaging";
import { RING_TIMEOUT_MS } from "../callSignaling.constants";

const HOUR_MS = 60 * 60 * 1000;

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
    await prisma.lesson.deleteMany({ where: { tutorId } });
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
      lessonId: null,
    });
  });

  describe("lesson calls", () => {
    let lessonId: string;

    const inviteFromLesson = async (caller: "tutor" | "student"): Promise<string> => {
      await (caller === "tutor"
        ? handleCallSignal("tutor", tutorId, {
            type: "call_invite",
            inviteId: "invite-1",
            targetStudentId: studentId,
            lessonId,
          })
        : handleCallSignal("student", studentUserId, {
            type: "call_invite",
            inviteId: "invite-1",
            lessonId,
          }));
      const ringing = sent().find((m) => m.type === "call_ringing");
      if (!ringing || ringing.type !== "call_ringing") throw new Error("no ringing");
      return ringing.callId;
    };

    beforeEach(async () => {
      const start = new Date(Date.now() + HOUR_MS);
      const lesson = await prisma.lesson.create({
        data: {
          tutorId,
          studentId,
          subject: "PHYSICS",
          startTime: start,
          endTime: new Date(start.getTime() + HOUR_MS),
        },
      });
      lessonId = lesson.id;
    });

    it("should link a COMPLETED record to the lesson", async () => {
      const callId = await inviteFromLesson("tutor");
      await handleCallSignal("student", studentUserId, { type: "call_accept", callId });
      await handleCallSignal("tutor", tutorId, { type: "call_connected", callId });
      await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId });

      expect(await latestRecord()).toMatchObject({ status: "COMPLETED", lessonId });
    });

    it("should link a REJECTED record of a student call to the lesson", async () => {
      const callId = await inviteFromLesson("student");
      await handleCallSignal("tutor", tutorId, { type: "call_reject", callId });

      expect(await latestRecord()).toMatchObject({
        status: "REJECTED",
        callerKind: "STUDENT",
        lessonId,
      });
    });

    it("should link a CANCELED record to the lesson", async () => {
      const callId = await inviteFromLesson("tutor");
      await handleCallSignal("tutor", tutorId, { type: "call_cancel", callId });

      expect(await latestRecord()).toMatchObject({ status: "CANCELED", lessonId });
    });

    it("should link a FAILED record to the lesson", async () => {
      const callId = await inviteFromLesson("tutor");
      await handleCallSignal("student", studentUserId, { type: "call_accept", callId });
      await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId });

      expect(await latestRecord()).toMatchObject({ status: "FAILED", lessonId });
    });

    it("should link a MISSED record to the lesson when the callee is offline", async () => {
      callWebSocket.disconnect("student", studentUserId);
      await handleCallSignal("tutor", tutorId, {
        type: "call_invite",
        inviteId: "invite-1",
        targetStudentId: studentId,
        lessonId,
      });

      expect(await latestRecord()).toMatchObject({ status: "MISSED", lessonId });
    });

    it("should link a MISSED record to the lesson when ringing times out", async () => {
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask", "Date"] });
      try {
        await inviteFromLesson("student");
        jest.advanceTimersByTime(RING_TIMEOUT_MS);
      } finally {
        jest.useRealTimers();
      }
      await waitFor(() => sent().filter((m) => m.type === "call_history_updated").length === 2);

      expect(await latestRecord()).toMatchObject({ status: "MISSED", lessonId });
    });

    it("should link the record to the lesson when a participant drops", async () => {
      const callId = await inviteFromLesson("tutor");
      await handleCallSignal("student", studentUserId, { type: "call_accept", callId });
      await handleCallSignal("tutor", tutorId, { type: "call_connected", callId });
      await terminateActiveCallForParticipant("student", studentUserId);

      expect(await latestRecord()).toMatchObject({ status: "COMPLETED", lessonId });
    });

    it("should keep the record linked when the lesson becomes completed during the call", async () => {
      const callId = await inviteFromLesson("tutor");
      await handleCallSignal("student", studentUserId, { type: "call_accept", callId });
      await handleCallSignal("tutor", tutorId, { type: "call_connected", callId });
      await prisma.lesson.update({ where: { id: lessonId }, data: { status: "COMPLETED" } });
      await handleCallSignal("student", studentUserId, { type: "call_hangup", callId });

      expect(await latestRecord()).toMatchObject({ status: "COMPLETED", lessonId });
    });

    it("should save the record without the lesson when the lesson is deleted during the call", async () => {
      const callId = await inviteFromLesson("tutor");
      await handleCallSignal("student", studentUserId, { type: "call_accept", callId });
      await handleCallSignal("tutor", tutorId, { type: "call_connected", callId });
      await prisma.lesson.delete({ where: { id: lessonId } });
      await handleCallSignal("tutor", tutorId, { type: "call_hangup", callId });

      expect(await latestRecord()).toMatchObject({ status: "COMPLETED", lessonId: null });
      expect(sent().filter((m) => m.type === "call_history_updated")).toHaveLength(2);
    });

    it("should write a record without a lesson for a call from the student card", async () => {
      const callId = await inviteByTutor();
      await handleCallSignal("tutor", tutorId, { type: "call_cancel", callId });

      expect(await latestRecord()).toMatchObject({ status: "CANCELED", lessonId: null });
    });
  });
});
