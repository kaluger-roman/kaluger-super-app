import { waitFor } from "../../../__tests__/helpers";
import { processCallSignal } from "../../../services/callSignaling";
import { findActiveCallForParticipant } from "../../../services/callSignaling/callSignaling";
import type { CallerKindValue, CallSignalingInbound } from "../../../types";
import { prisma } from "../../prisma";
import { revokeTutorSessions } from "../../tokenRevocation";
import { messagesOf, openSocket, useCallPairManager } from "./wsManagerHarness";
import type { SocketStub } from "./wsManagerHarness";

describe("WebSocketManager: revoking the tutor's sessions during a call", () => {
  const harness = useCallPairManager();

  const signal = (kind: CallerKindValue, id: string, data: CallSignalingInbound) =>
    processCallSignal({ kind, id }, data);

  const connect = async () => ({
    tutorSocket: await openSocket(harness.manager, "tutor", "/ws?token=t"),
    studentSocket: await openSocket(harness.manager, "student", "/ws/student?token=s"),
  });

  const startCall = async (studentSocket: SocketStub): Promise<string> => {
    await signal("tutor", harness.tutorId, {
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: harness.studentId,
    });
    const incoming = messagesOf(studentSocket).find(({ type }) => type === "call_incoming");
    const callId = String(incoming?.callId);
    await signal("student", harness.studentUserId, { type: "call_accept", callId });
    await signal("tutor", harness.tutorId, { type: "call_connected", callId });
    return callId;
  };

  it("should end the call at once when the tutor's socket is already gone and the call waits for it", async () => {
    const { tutorSocket, studentSocket } = await connect();
    const callId = await startCall(studentSocket);
    tutorSocket.emit("close");
    expect(findActiveCallForParticipant("tutor", harness.tutorId)?.callId).toBe(callId);

    revokeTutorSessions(harness.tutorId, 1);

    expect(findActiveCallForParticipant("tutor", harness.tutorId)).toBeUndefined();
    expect(messagesOf(studentSocket)).toContainEqual({
      type: "call_ended",
      callId,
      reason: "peer_disconnected",
    });
    await waitFor(() =>
      messagesOf(studentSocket).some(({ type }) => type === "call_history_updated")
    );
    expect(await prisma.callRecord.count({ where: { tutorId: harness.tutorId } })).toBe(1);
  });

  it("should end the call at once and close the socket when the tutor is still connected", async () => {
    const { tutorSocket, studentSocket } = await connect();
    const callId = await startCall(studentSocket);

    revokeTutorSessions(harness.tutorId, 1);

    expect(findActiveCallForParticipant("tutor", harness.tutorId)).toBeUndefined();
    expect(tutorSocket.close).toHaveBeenCalledWith(4001, "Token revoked");
    expect(messagesOf(studentSocket)).toContainEqual({
      type: "call_ended",
      callId,
      reason: "peer_disconnected",
    });
    await waitFor(() =>
      messagesOf(studentSocket).some(({ type }) => type === "call_history_updated")
    );
  });
});
