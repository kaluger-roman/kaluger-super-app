import { processCallSignal } from "../../../services/callSignaling";
import type { CallerKindValue, CallSignalingInbound, PresenceState } from "../../../types";
import { REPLACED_CLOSE_CODE } from "../connection.constants";
import { messagesOf, openSocket, useCallPairManager } from "./wsManagerHarness";
import type { SocketStub } from "./wsManagerHarness";

const presence = (value: PresenceState): CallSignalingInbound => ({
  type: "presence_update",
  presence: value,
  audioSuspended: false,
  videoSuspended: false,
});

describe("WebSocketManager: another socket of a participant with a call", () => {
  const harness = useCallPairManager();

  const signal = (kind: CallerKindValue, id: string, data: CallSignalingInbound) =>
    processCallSignal({ kind, id }, data);
  const signalStudent = (data: CallSignalingInbound) =>
    signal("student", harness.studentUserId, data);

  const connectTutor = () => openSocket(harness.manager, "tutor", "/ws?token=t&tab=tutor-tab");
  const connectStudent = (query: string) =>
    openSocket(harness.manager, "student", `/ws/student?token=s&${query}`);

  const invite = async (tutorSocket: SocketStub): Promise<string> => {
    await signal("tutor", harness.tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: harness.studentId,
    });
    const ringing = messagesOf(tutorSocket).find(({ type }) => type === "call_ringing");
    return String(ringing?.callId);
  };

  it("should let a page opened from the notification take an incoming call that rings in a background tab", async () => {
    const tutorSocket = await connectTutor();
    const desktop = await connectStudent("tab=desktop");
    await signalStudent(presence("background"));
    const callId = await invite(tutorSocket);

    const phone = await connectStudent("tab=phone");
    await signalStudent({ type: "call_sync" });
    await signalStudent({ type: "call_accept", callId });

    expect(desktop.close).toHaveBeenCalledWith(REPLACED_CLOSE_CODE, "Replaced by newer connection");
    expect(harness.manager.getConnection("student", harness.studentUserId)).toBe(phone);
    expect(messagesOf(phone)).toContainEqual({ type: "connection_ready" });
    expect(messagesOf(phone)).toContainEqual(
      expect.objectContaining({
        type: "call_state",
        call: expect.objectContaining({ callId, status: "ringing", direction: "incoming" }),
      })
    );
    expect(messagesOf(tutorSocket)).toContainEqual(
      expect.objectContaining({ type: "call_accepted", callId })
    );
  });

  it("should not let an automatic reconnect of another tab take a ringing incoming call", async () => {
    const tutorSocket = await connectTutor();
    const desktop = await connectStudent("tab=desktop");
    await invite(tutorSocket);

    const phone = await connectStudent("tab=phone&resume=1");

    expect(phone.close).toHaveBeenCalledWith(REPLACED_CLOSE_CODE, "Connection held by another tab");
    expect(harness.manager.getConnection("student", harness.studentUserId)).toBe(desktop);
  });

  it("should keep an answered call with its tab while another page waits", async () => {
    const tutorSocket = await connectTutor();
    const desktop = await connectStudent("tab=desktop");
    const callId = await invite(tutorSocket);
    await signalStudent({ type: "call_accept", callId });

    const phone = await connectStudent("tab=phone");

    expect(messagesOf(phone)).toEqual([{ type: "connection_waiting", reason: "call" }]);
    expect(desktop.close).not.toHaveBeenCalled();
    expect(harness.manager.getConnection("student", harness.studentUserId)).toBe(desktop);
  });

  it("should tell the peer the participant is back on screen once the same tab replaced its dead socket", async () => {
    const tutorSocket = await connectTutor();
    await connectStudent("tab=phone");
    const callId = await invite(tutorSocket);
    await signalStudent({ type: "call_accept", callId });
    await signal("tutor", harness.tutorId, { type: "call_connected", callId });
    await signalStudent(presence("background"));

    await connectStudent("tab=phone&resume=1");
    tutorSocket.send.mockClear();
    await signalStudent(presence("on_screen"));
    await signalStudent({ type: "call_resume", callId, sessionRestart: false });

    expect(messagesOf(tutorSocket)).toEqual([
      {
        type: "call_peer_presence",
        callId,
        presence: "on_screen",
        audioSuspended: false,
        videoSuspended: false,
      },
    ]);
  });
});
