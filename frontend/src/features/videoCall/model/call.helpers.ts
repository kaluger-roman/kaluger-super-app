import type { CallPeer, CallStatusMessage, StartCallParams } from "./call.types";

export const toOutgoingPeer = (params: StartCallParams): CallPeer =>
  "studentId" in params
    ? { id: params.studentId, name: params.peerName, role: "student" }
    : { id: "", name: params.peerName, role: "tutor" };

export const toErrorMessage = (text: string): CallStatusMessage => ({
  kind: "error",
  text,
});

export const hasCallId = (callId: string | null): callId is string => callId !== null;
