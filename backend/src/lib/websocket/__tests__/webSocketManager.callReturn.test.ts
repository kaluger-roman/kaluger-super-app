import { processCallSignal } from "../../../services/callSignaling";
import type { CallerKindValue, CallSignalingInbound } from "../../../types";
import { HOLDER_GONE_CLOSE_CODE, REPLACED_CLOSE_CODE } from "../connection.constants";
import { dropSocket, messagesOf, openSocket, useCallPairManager } from "./wsManagerHarness";
import type { SocketStub } from "./wsManagerHarness";

describe("WebSocketManager: a participant coming back to a call kept for them", () => {
  const harness = useCallPairManager();

  const signal = (kind: CallerKindValue, id: string, data: CallSignalingInbound) =>
    processCallSignal({ kind, id }, data);
  const signalStudent = (data: CallSignalingInbound) =>
    signal("student", harness.studentUserId, data);

  const connectTutor = () => openSocket(harness.manager, "tutor", "/ws?token=t&tab=tutor-tab");
  const connectStudent = (query: string) =>
    openSocket(harness.manager, "student", `/ws/student?token=s&${query}`);
  const studentConnection = () => harness.manager.getConnection("student", harness.studentUserId);

  // The call goes on on the phone while desktop tabs, opened meanwhile, wait; then the phone's
  // socket dies and the desktop tabs are let go by 4004.
  const callWithPhoneGone = async (desktopTabs: string[]) => {
    const tutorSocket = await connectTutor();
    const phone = await connectStudent("tab=phone");
    await signal("tutor", harness.tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: harness.studentId,
    });
    const ringing = messagesOf(tutorSocket).find(({ type }) => type === "call_ringing");
    const callId = String(ringing?.callId);
    await signalStudent({ type: "call_accept", callId });
    await signal("tutor", harness.tutorId, { type: "call_connected", callId });
    const waiting: SocketStub[] = [];
    for (const tab of desktopTabs) {
      const ws = await connectStudent(`tab=${tab}`);
      expect(messagesOf(ws)).toEqual([{ type: "connection_waiting", reason: "call" }]);
      waiting.push(ws);
    }

    await dropSocket(phone);
    waiting.forEach((ws) =>
      expect(ws.close).toHaveBeenCalledWith(HOLDER_GONE_CLOSE_CODE, "Call holder is gone")
    );
    return { tutorSocket, callId };
  };

  // The desktop tab, let in by 4004, reconnects while hidden without picking the call up.
  const callTakenOverByHiddenTab = async () => {
    const { tutorSocket, callId } = await callWithPhoneGone(["desktop"]);
    const desktop = await connectStudent("tab=desktop&resume=1");
    expect(studentConnection()).toBe(desktop);
    return { tutorSocket, desktop, callId };
  };

  it("should give the connection back to the returning page that held the call, not keep it waiting behind a tab that never picked the call up (regression: both sides lost the call)", async () => {
    const { tutorSocket, desktop, callId } = await callTakenOverByHiddenTab();

    const phone = await connectStudent("tab=phone&resume=1");

    expect(messagesOf(phone)).toContainEqual({ type: "connection_ready" });
    expect(messagesOf(phone)).not.toContainEqual({ type: "connection_waiting", reason: "call" });
    expect(desktop.close).toHaveBeenCalledWith(REPLACED_CLOSE_CODE, "Replaced by newer connection");
    expect(studentConnection()).toBe(phone);

    tutorSocket.send.mockClear();
    await signalStudent({ type: "call_resume", callId, sessionRestart: false });
    expect(messagesOf(tutorSocket)).toContainEqual({
      type: "call_peer_resumed",
      callId,
      sessionRestart: false,
    });
  });

  it("should keep the call with the tab that picked it up after 4004", async () => {
    const { desktop, callId } = await callTakenOverByHiddenTab();
    await signalStudent({ type: "call_resume", callId, sessionRestart: true });

    const phone = await connectStudent("tab=phone&resume=1");

    expect(messagesOf(phone)).toEqual([{ type: "connection_waiting", reason: "call" }]);
    expect(desktop.close).not.toHaveBeenCalled();
    expect(studentConnection()).toBe(desktop);
  });

  it("should not let tabs released together by 4004 take the connection from each other (regression: the hidden tab displaced the one restoring the call)", async () => {
    const { tutorSocket, callId } = await callWithPhoneGone(["visible", "hidden"]);
    const visible = await connectStudent("tab=visible&resume=1");

    const hidden = await connectStudent("tab=hidden&resume=1");

    expect(hidden.close).toHaveBeenCalledWith(
      REPLACED_CLOSE_CODE,
      "Connection held by another tab"
    );
    expect(messagesOf(hidden)).toEqual([]);
    expect(visible.close).not.toHaveBeenCalled();
    expect(studentConnection()).toBe(visible);

    tutorSocket.send.mockClear();
    await signalStudent({ type: "call_resume", callId, sessionRestart: true });
    expect(messagesOf(tutorSocket)).toContainEqual({
      type: "call_peer_resumed",
      callId,
      sessionRestart: true,
    });
  });

  it("should still give the connection back to the returning phone after several tabs were released", async () => {
    await callWithPhoneGone(["visible", "hidden"]);
    const visible = await connectStudent("tab=visible&resume=1");

    const phone = await connectStudent("tab=phone&resume=1");

    expect(visible.close).toHaveBeenCalledWith(REPLACED_CLOSE_CODE, "Replaced by newer connection");
    expect(studentConnection()).toBe(phone);
  });
});
