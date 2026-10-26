import * as callModel from "../call.model";
import type { IceServerPayload } from "../call.types";
import { dispatchCallSignal } from "../signaling.helpers";
import type { CallRole, CallSignalingInbound, CallSignalingOutbound } from "../signaling.types";
import { resetCallTransportsForTests, setCallTransport } from "../transport.helpers";
import { resetWebRtcAdapter, stopAllSessions } from "../webrtc.helpers";
import { readStore } from "./storeProbe";

export const settleMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

// Records every signal the call flow sends, for both roles a tab can hold.
export const installTransport = (): CallSignalingInbound[] => {
  const sent: CallSignalingInbound[] = [];
  setCallTransport("tutor", (message) => sent.push(message), "tutor-socket");
  setCallTransport("student", (message) => sent.push(message), "student-socket");
  return sent;
};

export const resetCallFlow = (): void => {
  callModel.hangUp();
  stopAllSessions();
  resetCallTransportsForTests();
  resetWebRtcAdapter();
};

export const receive = (message: CallSignalingOutbound, role: CallRole = "tutor"): void => {
  dispatchCallSignal(message, role);
};

export const ringCurrentInvite = (callId: string): void => {
  const inviteId = readStore(callModel.$inviteId);
  if (!inviteId) throw new Error("No invite is waiting for call_ringing");
  receive({ type: "call_ringing", callId, inviteId });
};

export const startCallerSession = async (
  callId: string,
  iceServers: IceServerPayload[] = []
): Promise<void> => {
  callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
  ringCurrentInvite(callId);
  receive({ type: "call_accepted", callId, iceServers });
  await settleMicrotasks();
};

export const startCalleeSession = async (
  callId: string,
  iceServers: IceServerPayload[] = []
): Promise<void> => {
  receive({ type: "call_incoming", callId, callerName: "Анна", lesson: null, iceServers });
  callModel.acceptCall();
  receive({ type: "webrtc_offer", callId, sdp: { type: "offer", sdp: "initial" } });
  await settleMicrotasks();
};

export const connectCallerSession = async (
  callId: string,
  iceServers: IceServerPayload[] = []
): Promise<void> => {
  await startCallerSession(callId, iceServers);
  receive({ type: "webrtc_answer", callId, sdp: { type: "answer", sdp: "answer" } });
  callModel.callConnected();
  await settleMicrotasks();
};
