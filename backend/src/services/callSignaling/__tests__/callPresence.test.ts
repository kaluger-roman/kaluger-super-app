import { callWebSocket, uniqueEmail } from "../../../__tests__/helpers";

import { prisma } from "../../../lib/prisma";
import type { CallSignalingInbound, CallerKindValue, PresenceState } from "../../../types";
import { processCallSignal } from "../callFlow";
import { isVisible } from "../callPresence";
import { participantDisconnected } from "../callReconnect";
import * as callRegistry from "../callSignaling";
import { getPresence } from "../presenceRegistry";

jest.mock(
  "../../../lib/wsManager",
  () => jest.requireActual("../../../__tests__/helpers").callWebSocketManagerModule
);

const { messagesOfType } = callWebSocket;

const signal = (kind: CallerKindValue, id: string, data: CallSignalingInbound): Promise<void> =>
  processCallSignal({ kind, id }, data);

const presenceUpdate = (
  presence: PresenceState,
  audioSuspended = false,
  videoSuspended = false
): CallSignalingInbound => ({ type: "presence_update", presence, audioSuspended, videoSuspended });

describe("call presence", () => {
  let tutorId: string;
  let studentId: string;
  let studentUserId: string;

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
    await prisma.callRecord.deleteMany({ where: { tutorId } });
  });

  afterAll(async () => {
    await prisma.callRecord.deleteMany({ where: { tutorId } });
    await prisma.studentUser.deleteMany({ where: { id: studentUserId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.user.deleteMany({ where: { id: tutorId } });
  });

  const invite = async (): Promise<string> => {
    await signal("tutor", tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: studentId,
    });
    const ringing = messagesOfType("call_ringing")[0]?.message;
    if (ringing?.type !== "call_ringing") throw new Error("no ringing");
    callWebSocket.clearSent();
    return ringing.callId;
  };

  const accept = async (callId: string): Promise<void> => {
    await signal("student", studentUserId, { type: "call_accept", callId });
  };

  const sync = (kind: CallerKindValue, id: string): Promise<void> =>
    signal(kind, id, { type: "call_sync" });

  it("should answer call_sync with call_state null outside a call", async () => {
    await sync("student", studentUserId);

    expect(callWebSocket.sent).toEqual([
      { kind: "student", id: studentUserId, message: { type: "call_state", call: null } },
    ]);
  });

  it("should not answer a presence update, on screen or in the background", async () => {
    const callId = await invite();
    await accept(callId);
    callWebSocket.clearSent();

    await signal("tutor", tutorId, presenceUpdate("on_screen"));
    await signal("student", studentUserId, presenceUpdate("on_screen"));

    expect(callWebSocket.sent).toEqual([]);
    await signal("tutor", tutorId, { type: "call_hangup", callId });
  });

  it("should store a background update without answering it", async () => {
    await signal("student", studentUserId, presenceUpdate("background", true, true));

    expect(callWebSocket.sent).toEqual([]);
    expect(getPresence({ kind: "student", id: studentUserId })).toEqual({
      presence: "background",
      audioSuspended: true,
      videoSuspended: true,
    });
  });

  it("should store the presence and relay it to the peer only when it changes", async () => {
    const callId = await invite();
    await accept(callId);
    callWebSocket.clearSent();

    await signal("student", studentUserId, presenceUpdate("background", true, true));
    await signal("student", studentUserId, presenceUpdate("background", true, true));
    await signal("student", studentUserId, presenceUpdate("background", false, true));

    expect(
      messagesOfType("call_peer_presence").map(({ id, message }) => ({ id, message }))
    ).toEqual([
      {
        id: tutorId,
        message: {
          type: "call_peer_presence",
          callId,
          presence: "background",
          audioSuspended: true,
          videoSuspended: true,
        },
      },
      {
        id: tutorId,
        message: {
          type: "call_peer_presence",
          callId,
          presence: "background",
          audioSuspended: false,
          videoSuspended: true,
        },
      },
    ]);
  });

  it("should answer call_sync with a snapshot from each participant's side", async () => {
    const callId = await invite();
    await accept(callId);
    await signal("tutor", tutorId, { type: "call_connected", callId });
    await signal("tutor", tutorId, presenceUpdate("background", false, true));
    callWebSocket.clearSent();

    await sync("student", studentUserId);
    await sync("tutor", tutorId);

    const states = messagesOfType("call_state");
    const connectedAt = callRegistry.getCall(callId)?.connectedAt?.toISOString();
    expect(connectedAt).toBeDefined();
    expect(states[0]).toMatchObject({
      id: studentUserId,
      message: {
        type: "call_state",
        call: {
          callId,
          status: "connected",
          direction: "incoming",
          peerName: "Анна",
          lesson: null,
          peerPresence: { presence: "background", audioSuspended: false, videoSuspended: true },
          connectedAt,
        },
      },
    });
    expect(states[1]).toMatchObject({
      id: tutorId,
      message: {
        call: {
          direction: "outgoing",
          peerName: "Иван",
          peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
        },
      },
    });
    const snapshot = states[1].message.type === "call_state" ? states[1].message.call : null;
    expect(snapshot?.iceServers.length).toBeGreaterThan(0);
  });

  it("should show a disconnected peer in the snapshot and not relay updates of a gone participant", async () => {
    const callId = await invite();
    await accept(callId);
    callWebSocket.disconnect("student", studentUserId);
    await participantDisconnected({ kind: "student", id: studentUserId });
    callWebSocket.connect("student", studentUserId);
    callWebSocket.clearSent();

    await signal("student", studentUserId, presenceUpdate("background", true, true));
    await sync("tutor", tutorId);

    expect(messagesOfType("call_peer_presence")).toEqual([]);
    expect(messagesOfType("call_state")[0].message).toMatchObject({
      call: {
        callId,
        status: "accepted",
        connectedAt: null,
        peerPresence: { presence: "disconnected" },
      },
    });
    await signal("tutor", tutorId, { type: "call_hangup", callId });
  });

  it("should tell each side on accept that the other one is away", async () => {
    const callId = await invite();
    await signal("tutor", tutorId, presenceUpdate("background", true, true));
    callWebSocket.clearSent();

    await accept(callId);

    expect(
      messagesOfType("call_peer_presence").map(({ id, message }) => ({ id, message }))
    ).toEqual([
      {
        id: studentUserId,
        message: {
          type: "call_peer_presence",
          callId,
          presence: "background",
          audioSuspended: true,
          videoSuspended: true,
        },
      },
    ]);
  });

  it("should send no presence on accept when both are on screen", async () => {
    const callId = await invite();

    await accept(callId);

    expect(messagesOfType("call_peer_presence")).toEqual([]);
  });

  it("should see a window as visible only while connected and on screen", async () => {
    const participant = { kind: "student" as const, id: studentUserId };
    expect(isVisible(participant)).toBe(true);

    await signal("student", studentUserId, presenceUpdate("background"));
    expect(isVisible(participant)).toBe(false);

    await signal("student", studentUserId, presenceUpdate("on_screen"));
    callWebSocket.disconnect("student", studentUserId);
    expect(isVisible(participant)).toBe(false);
  });

  it("should forget the presence of a participant who disconnected", async () => {
    await signal("student", studentUserId, presenceUpdate("background", true, true));

    await participantDisconnected({ kind: "student", id: studentUserId });

    expect(getPresence({ kind: "student", id: studentUserId }).presence).toBe("on_screen");
  });
});
