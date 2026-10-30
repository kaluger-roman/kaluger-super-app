import { callWebSocket, uniqueEmail, waitFor } from "../../../__tests__/helpers";

import { prisma } from "../../../lib/prisma";
import type { CallSignalingInbound, CallerKindValue } from "../../../types";
import { processCallSignal } from "../callFlow";
import { participantDisconnected, participantRevoked } from "../callReconnect";
import * as callRegistry from "../callSignaling";
import * as callSignalingHelpers from "../callSignaling.helpers";
import { CALL_RECONNECT_GRACE_MS, RING_TIMEOUT_MS } from "../callSignaling.constants";

jest.mock(
  "../../../lib/wsManager",
  () => jest.requireActual("../../../__tests__/helpers").callWebSocketManagerModule
);

const { messagesOfType } = callWebSocket;

const signal = (kind: CallerKindValue, id: string, data: CallSignalingInbound): Promise<void> =>
  processCallSignal({ kind, id }, data);

// The grace timer is set while fake timers are on; the record is written after they are off.
const withFakeTimers = async (run: () => Promise<void> | void): Promise<void> => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  try {
    await run();
  } finally {
    jest.useRealTimers();
  }
};

describe("call reconnect grace", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;
  const extraStudentIds: string[] = [];
  const extraStudentUserIds: string[] = [];

  const tutor = () => ({ kind: "tutor" as const, id: tutorId });
  const student = () => ({ kind: "student" as const, id: studentUserId });

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

  beforeEach(() => {
    callWebSocket.reset();
    callWebSocket.connect("tutor", tutorId);
    callWebSocket.connect("student", studentUserId);
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    await prisma.callRecord.deleteMany({ where: { tutorId } });
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.studentUser.deleteMany({
      where: { id: { in: [studentUserId, ...extraStudentUserIds] } },
    });
    await prisma.student.deleteMany({ where: { id: { in: [studentId, ...extraStudentIds] } } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
  });

  const invite = async (targetStudentId = studentId): Promise<string> => {
    await signal("tutor", tutorId, { type: "call_invite", inviteId: "invite-1", targetStudentId });
    const ringing = messagesOfType("call_ringing")[0]?.message;
    if (ringing?.type !== "call_ringing") throw new Error("no ringing");
    return ringing.callId;
  };

  const connectCall = async (): Promise<string> => {
    const callId = await invite();
    await signal("student", studentUserId, { type: "call_accept", callId });
    await signal("tutor", tutorId, { type: "call_connected", callId });
    callWebSocket.clearSent();
    return callId;
  };

  const dropStudent = async (): Promise<void> => {
    callWebSocket.disconnect("student", studentUserId);
    await participantDisconnected(student());
  };

  const latestRecord = () =>
    prisma.callRecord.findFirstOrThrow({ where: { tutorId }, orderBy: { createdAt: "desc" } });

  const historyRefreshed = () => messagesOfType("call_history_updated").length >= 2;

  const studentResumed = (callId: string) => ({
    kind: "student" as const,
    id: studentUserId,
    message: { type: "call_resumed" as const, callId },
  });

  it("should keep a connected call when a participant loses the connection", async () => {
    const callId = await connectCall();

    await withFakeTimers(dropStudent);

    expect(callRegistry.getCall(callId)?.status).toBe("connected");
    expect(messagesOfType("call_ended")).toHaveLength(0);
    expect(messagesOfType("call_peer_presence")).toEqual([
      {
        kind: "tutor",
        id: tutorId,
        message: {
          type: "call_peer_presence",
          callId,
          presence: "disconnected",
          audioSuspended: false,
          videoSuspended: false,
        },
      },
    ]);
    expect(callWebSocket.releasedHolderGone).toEqual([`student:${studentUserId}`]);
    expect(callWebSocket.released).toEqual([]);
  });

  it("should take the participant back before the grace runs out", async () => {
    const callId = await connectCall();

    await withFakeTimers(async () => {
      await dropStudent();
      jest.advanceTimersByTime(CALL_RECONNECT_GRACE_MS - 1000);
      callWebSocket.connect("student", studentUserId);
      callWebSocket.clearSent();
      await signal("student", studentUserId, {
        type: "call_resume",
        callId,
        sessionRestart: false,
      });
      jest.advanceTimersByTime(CALL_RECONNECT_GRACE_MS);
    });

    expect(callRegistry.getCall(callId)?.disconnectedAt).toEqual({});
    expect(callWebSocket.sent.map(({ id, message }) => ({ id, message }))).toEqual([
      { id: tutorId, message: { type: "call_peer_resumed", callId, sessionRestart: false } },
      {
        id: tutorId,
        message: {
          type: "call_peer_presence",
          callId,
          presence: "on_screen",
          audioSuspended: false,
          videoSuspended: false,
        },
      },
      { id: studentUserId, message: { type: "call_resumed", callId } },
    ]);
  });

  it("should end the call for the peer once the grace runs out and count it up to the drop", async () => {
    const callId = await connectCall();
    const call = callRegistry.getCall(callId);
    if (!call) throw new Error("no call");

    await withFakeTimers(async () => {
      call.connectedAt = new Date(Date.now() - 60_000);
      await dropStudent();
      jest.advanceTimersByTime(CALL_RECONNECT_GRACE_MS);
    });
    await waitFor(historyRefreshed);

    expect(callRegistry.getCall(callId)).toBeUndefined();
    expect(messagesOfType("call_ended")).toEqual([
      {
        kind: "tutor",
        id: tutorId,
        message: { type: "call_ended", callId, reason: "peer_not_returned" },
      },
    ]);
    const record = await latestRecord();
    expect(record.status).toBe("COMPLETED");
    expect(record.durationSeconds).toBe(60);
    expect(callWebSocket.released).toEqual([`tutor:${tutorId}`, `student:${studentUserId}`]);
  });

  it("should end an accepted call that never connected as FAILED", async () => {
    const callId = await invite();
    await signal("student", studentUserId, { type: "call_accept", callId });

    await withFakeTimers(async () => {
      await dropStudent();
      expect(callRegistry.getCall(callId)?.status).toBe("accepted");
      jest.advanceTimersByTime(CALL_RECONNECT_GRACE_MS);
    });
    await waitFor(historyRefreshed);

    expect((await latestRecord()).status).toBe("FAILED");
  });

  it("should write one record when both participants are gone", async () => {
    const callId = await connectCall();

    await withFakeTimers(async () => {
      await dropStudent();
      jest.advanceTimersByTime(1000);
      callWebSocket.disconnect("tutor", tutorId);
      await participantDisconnected(tutor());
      jest.advanceTimersByTime(CALL_RECONNECT_GRACE_MS * 2);
    });
    await waitFor(historyRefreshed);

    expect(callRegistry.getCall(callId)).toBeUndefined();
    expect(messagesOfType("call_ended")).toHaveLength(1);
    expect(await prisma.callRecord.count({ where: { tutorId } })).toBe(1);
  });

  it("should tell a returning participant that the peer hung up meanwhile", async () => {
    const callId = await connectCall();
    await withFakeTimers(dropStudent);
    await signal("tutor", tutorId, { type: "call_hangup", callId });
    callWebSocket.connect("student", studentUserId);
    callWebSocket.clearSent();

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: true });

    expect(callWebSocket.sent.map(({ id, message }) => ({ id, message }))).toEqual([
      { id: studentUserId, message: { type: "call_state", call: null } },
    ]);
  });

  it("should keep ringing until the ring timeout when the caller loses the connection", async () => {
    let callId = "";

    await withFakeTimers(async () => {
      callId = await invite();
      callWebSocket.disconnect("tutor", tutorId);
      await participantDisconnected(tutor());
      expect(callRegistry.getCall(callId)?.status).toBe("ringing");
      expect(messagesOfType("call_canceled")).toHaveLength(0);
      jest.advanceTimersByTime(RING_TIMEOUT_MS);
    });
    await waitFor(historyRefreshed);

    expect(messagesOfType("call_canceled")[0].message).toMatchObject({ reason: "timeout" });
    expect(messagesOfType("call_ended")).toHaveLength(0);
    expect((await latestRecord()).status).toBe("MISSED");
  });

  it("should let the callee answer while the caller is away", async () => {
    const callId = await invite();
    await withFakeTimers(async () => {
      callWebSocket.disconnect("tutor", tutorId);
      await participantDisconnected(tutor());
    });
    callWebSocket.clearSent();

    await signal("student", studentUserId, { type: "call_accept", callId });

    expect(callRegistry.getCall(callId)?.status).toBe("accepted");
    expect(messagesOfType("call_peer_presence")).toEqual([
      {
        kind: "student",
        id: studentUserId,
        message: {
          type: "call_peer_presence",
          callId,
          presence: "disconnected",
          audioSuspended: false,
          videoSuspended: false,
        },
      },
    ]);
  });

  it("should end at once a call that waits for a participant whose sessions are revoked", async () => {
    const callId = await connectCall();
    await withFakeTimers(async () => {
      callWebSocket.disconnect("tutor", tutorId);
      await participantDisconnected(tutor());
    });
    callWebSocket.clearSent();

    await participantRevoked(tutor());

    expect(callRegistry.getCall(callId)).toBeUndefined();
    expect(messagesOfType("call_ended")).toEqual([
      {
        kind: "student",
        id: studentUserId,
        message: { type: "call_ended", callId, reason: "peer_disconnected" },
      },
    ]);
    expect((await latestRecord()).status).toBe("COMPLETED");
  });

  it("should end the call of a connected participant whose sessions are revoked", async () => {
    const callId = await connectCall();

    await participantRevoked(tutor());

    expect(callRegistry.getCall(callId)).toBeUndefined();
    expect(messagesOfType("call_ended")[0]).toMatchObject({ kind: "student", id: studentUserId });
    expect(callWebSocket.released).toEqual([`tutor:${tutorId}`, `student:${studentUserId}`]);
  });

  it("should still give up a ringing call at once when the callee loses the connection", async () => {
    const callId = await invite();

    await dropStudent();

    expect(callRegistry.getCall(callId)).toBeUndefined();
    expect(messagesOfType("call_unavailable")[0]).toMatchObject({ id: tutorId });
  });

  it("should answer call_state null to a resume of an unknown or foreign call", async () => {
    const callId = await connectCall();
    const { studentUserId: strangerId } = await createLinkedStudent();

    await signal("student", studentUserId, {
      type: "call_resume",
      callId: "missing",
      sessionRestart: false,
    });
    await signal("student", strangerId, { type: "call_resume", callId, sessionRestart: true });

    expect(callWebSocket.sent.map(({ id, message }) => ({ id, message }))).toEqual([
      { id: studentUserId, message: { type: "call_state", call: null } },
      { id: strangerId, message: { type: "call_state", call: null } },
    ]);
    expect(callRegistry.getCall(callId)).toBeDefined();
  });

  it("should end the call when the returning student is no longer linked to the tutor", async () => {
    const linked = await createLinkedStudent();
    callWebSocket.connect("student", linked.studentUserId);
    const callId = await invite(linked.studentId);
    await signal("student", linked.studentUserId, { type: "call_accept", callId });
    await signal("tutor", tutorId, { type: "call_connected", callId });
    await prisma.studentUser.update({
      where: { id: linked.studentUserId },
      data: { studentId: null },
    });
    callWebSocket.clearSent();

    await signal("student", linked.studentUserId, {
      type: "call_resume",
      callId,
      sessionRestart: true,
    });
    await waitFor(historyRefreshed);

    expect(callRegistry.getCall(callId)).toBeUndefined();
    expect(messagesOfType("call_ended")).toEqual([
      { kind: "tutor", id: tutorId, message: { type: "call_ended", callId, reason: "hangup" } },
    ]);
    expect(messagesOfType("call_state")).toEqual([
      { kind: "student", id: linked.studentUserId, message: { type: "call_state", call: null } },
    ]);
    expect(messagesOfType("call_peer_resumed")).toHaveLength(0);
  });

  it("should end the call, not answer with an error, when the pair cannot be checked on resume", async () => {
    const callId = await connectCall();
    jest
      .spyOn(callSignalingHelpers, "resolvePairForStudent")
      .mockRejectedValueOnce(new Error("db down"));
    const logged = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: true });
    await waitFor(historyRefreshed);

    expect(callRegistry.getCall(callId)).toBeUndefined();
    expect(messagesOfType("call_error")).toEqual([]);
    expect(messagesOfType("call_state")).toEqual([
      { kind: "student", id: studentUserId, message: { type: "call_state", call: null } },
    ]);
    expect(messagesOfType("call_ended")).toEqual([
      { kind: "tutor", id: tutorId, message: { type: "call_ended", callId, reason: "hangup" } },
    ]);
    expect(logged).toHaveBeenCalled();
    expect((await latestRecord()).status).toBe("COMPLETED");
  });

  it("should not confirm a resume whose pair cannot be checked", async () => {
    const callId = await connectCall();
    jest
      .spyOn(callSignalingHelpers, "resolvePairForStudent")
      .mockRejectedValueOnce(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });
    await waitFor(historyRefreshed);

    expect(callRegistry.getCall(callId)).toBeUndefined();
    expect(messagesOfType("call_resumed")).toEqual([]);
  });

  it("should not confirm a resume whose socket closed while the pair was checked", async () => {
    const callId = await connectCall();

    await withFakeTimers(async () => {
      await dropStudent();
      callWebSocket.connect("student", studentUserId);
      callWebSocket.clearSent();
      const resuming = signal("student", studentUserId, {
        type: "call_resume",
        callId,
        sessionRestart: false,
      });
      await dropStudent();
      await resuming;
    });

    expect(callRegistry.getCall(callId)?.disconnectedAt.student).toBeInstanceOf(Date);
    expect(messagesOfType("call_resumed")).toEqual([]);
  });

  it("should keep waiting for a participant whose socket closes again while the resume is checked", async () => {
    const callId = await connectCall();

    await withFakeTimers(async () => {
      await dropStudent();
      callWebSocket.connect("student", studentUserId);
      callWebSocket.clearSent();
      const resuming = signal("student", studentUserId, {
        type: "call_resume",
        callId,
        sessionRestart: true,
      });
      await dropStudent();
      await resuming;
      expect(callRegistry.getCall(callId)?.disconnectedAt.student).toBeInstanceOf(Date);
      jest.advanceTimersByTime(CALL_RECONNECT_GRACE_MS);
    });
    await waitFor(historyRefreshed);

    expect(messagesOfType("call_peer_resumed")).toEqual([]);
    expect(messagesOfType("call_restart_announced")).toEqual([]);
    expect(messagesOfType("call_ended")).toEqual([
      {
        kind: "tutor",
        id: tutorId,
        message: { type: "call_ended", callId, reason: "peer_not_returned" },
      },
    ]);
  });

  it("should tell the peer nothing on a repeated resume, but rebuild on a session restart", async () => {
    const callId = await connectCall();

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });
    expect(callWebSocket.sent).toEqual([studentResumed(callId)]);

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: true });
    expect(messagesOfType("call_peer_resumed")).toEqual([
      {
        kind: "tutor",
        id: tutorId,
        message: { type: "call_peer_resumed", callId, sessionRestart: true },
      },
    ]);
  });

  it("should confirm a session restart to the sender only after the peer was asked to rebuild", async () => {
    const callId = await connectCall();

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: true });

    expect(callWebSocket.sent.map(({ id, message }) => ({ id, type: message.type }))).toEqual([
      { id: tutorId, type: "call_peer_resumed" },
      { id: tutorId, type: "call_peer_presence" },
      { id: studentUserId, type: "call_restart_announced" },
    ]);
    expect(messagesOfType("call_restart_announced")[0]?.message).toEqual({
      type: "call_restart_announced",
      callId,
    });
  });

  it("should ask a participant who was away during the peer's session restart to rebuild once it is back, before confirming its return (regression: its ICE restart offer reached the rebuilt peer)", async () => {
    const callId = await connectCall();
    await withFakeTimers(dropStudent);
    callWebSocket.clearSent();

    await signal("tutor", tutorId, { type: "call_resume", callId, sessionRestart: true });

    expect(messagesOfType("call_peer_resumed")).toEqual([]);
    expect(messagesOfType("call_restart_announced")).toEqual([
      { kind: "tutor", id: tutorId, message: { type: "call_restart_announced", callId } },
    ]);

    callWebSocket.connect("student", studentUserId);
    callWebSocket.clearSent();
    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });

    expect(messagesOfType("call_peer_resumed")).toEqual([
      {
        kind: "tutor",
        id: tutorId,
        message: { type: "call_peer_resumed", callId, sessionRestart: false },
      },
      {
        kind: "student",
        id: studentUserId,
        message: { type: "call_peer_resumed", callId, sessionRestart: true },
      },
    ]);
    expect(callWebSocket.sent.filter(({ kind }) => kind === "student")).toEqual([
      {
        kind: "student",
        id: studentUserId,
        message: { type: "call_peer_resumed", callId, sessionRestart: true },
      },
      studentResumed(callId),
    ]);

    callWebSocket.clearSent();
    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });

    expect(callWebSocket.sent).toEqual([studentResumed(callId)]);
  });

  it("should not ask a participant who restarts its own session to rebuild for the peer's restart missed while away", async () => {
    const callId = await connectCall();
    await withFakeTimers(dropStudent);
    await signal("tutor", tutorId, { type: "call_resume", callId, sessionRestart: true });
    callWebSocket.connect("student", studentUserId);
    callWebSocket.clearSent();

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: true });

    expect(callWebSocket.sent.map(({ id, message }) => ({ id, type: message.type }))).toEqual([
      { id: tutorId, type: "call_peer_resumed" },
      { id: tutorId, type: "call_peer_presence" },
      { id: studentUserId, type: "call_restart_announced" },
    ]);
    expect(messagesOfType("call_peer_resumed")[0]?.message).toEqual({
      type: "call_peer_resumed",
      callId,
      sessionRestart: true,
    });
  });

  it("should leave a resume to the page that took the participant's connection while the pair was checked (regression: the peer rebuilt for a displaced tab)", async () => {
    const callId = await connectCall();

    await withFakeTimers(async () => {
      await dropStudent();
      callWebSocket.connect("student", studentUserId);
      callWebSocket.replaceConnection("student", studentUserId);
      callWebSocket.clearSent();
      const tabResuming = signal("student", studentUserId, {
        type: "call_resume",
        callId,
        sessionRestart: true,
      });
      callWebSocket.replaceConnection("student", studentUserId);
      await tabResuming;

      expect(callWebSocket.sent).toEqual([]);
      expect(callRegistry.getCall(callId)?.disconnectedAt.student).toBeInstanceOf(Date);

      await signal("student", studentUserId, {
        type: "call_resume",
        callId,
        sessionRestart: false,
      });
    });

    expect(callRegistry.getCall(callId)?.disconnectedAt).toEqual({});
    expect(messagesOfType("call_peer_resumed")).toEqual([
      {
        kind: "tutor",
        id: tutorId,
        message: { type: "call_peer_resumed", callId, sessionRestart: false },
      },
    ]);
    expect(messagesOfType("call_restart_announced")).toEqual([]);
  });

  it("should ask the peer to rebuild again when it comes back over another connection than the request went to (regression: the request was lost in a dead socket)", async () => {
    const callId = await connectCall();
    await signal("tutor", tutorId, { type: "call_resume", callId, sessionRestart: true });
    expect(messagesOfType("call_peer_resumed")).toEqual([
      {
        kind: "student",
        id: studentUserId,
        message: { type: "call_peer_resumed", callId, sessionRestart: true },
      },
    ]);
    callWebSocket.replaceConnection("student", studentUserId);
    callWebSocket.clearSent();

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });

    expect(callWebSocket.sent).toEqual([
      {
        kind: "student",
        id: studentUserId,
        message: { type: "call_peer_resumed", callId, sessionRestart: true },
      },
      studentResumed(callId),
    ]);

    callWebSocket.clearSent();
    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });

    expect(callWebSocket.sent).toEqual([studentResumed(callId)]);
  });

  it("should not ask the peer again once a signal came over the connection the request went to", async () => {
    const callId = await connectCall();
    await signal("tutor", tutorId, { type: "call_resume", callId, sessionRestart: true });
    await signal("student", studentUserId, {
      type: "webrtc_offer",
      callId,
      sdp: { type: "offer", sdp: "rebuilt" },
    });
    callWebSocket.replaceConnection("student", studentUserId);
    callWebSocket.clearSent();

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });

    expect(callWebSocket.sent).toEqual([studentResumed(callId)]);
  });

  it("should not ask the peer again when it resumes over the connection the request went to", async () => {
    const callId = await connectCall();
    await signal("tutor", tutorId, { type: "call_resume", callId, sessionRestart: true });
    callWebSocket.clearSent();

    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });
    callWebSocket.replaceConnection("student", studentUserId);
    await signal("student", studentUserId, { type: "call_resume", callId, sessionRestart: false });

    expect(callWebSocket.sent).toEqual([studentResumed(callId), studentResumed(callId)]);
  });

  const createLinkedStudent = async () => {
    const created = await prisma.student.create({ data: { name: "Пётр", tutorId } });
    const studentUser = await prisma.studentUser.create({
      data: { email: uniqueEmail(), password: "hash", name: "Пётр", studentId: created.id },
    });
    extraStudentIds.push(created.id);
    extraStudentUserIds.push(studentUser.id);
    return { studentId: created.id, studentUserId: studentUser.id };
  };
});
