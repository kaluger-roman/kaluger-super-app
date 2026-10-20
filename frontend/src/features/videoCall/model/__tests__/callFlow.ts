import type { IceServerPayload } from "../call.types";
import { callModel, dispatchCallSignal } from "../index";

export const settleMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

export const startCallerSession = async (
  callId: string,
  iceServers: IceServerPayload[] = []
): Promise<void> => {
  callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
  dispatchCallSignal({ type: "call_ringing", callId, iceServers });
  dispatchCallSignal({ type: "call_accepted", callId, iceServers });
  await settleMicrotasks();
};

export const startCalleeSession = async (
  callId: string,
  iceServers: IceServerPayload[] = []
): Promise<void> => {
  dispatchCallSignal({ type: "call_incoming", callId, callerName: "Анна", iceServers });
  callModel.acceptCall();
  dispatchCallSignal({ type: "webrtc_offer", callId, sdp: { type: "offer", sdp: "initial" } });
  await settleMicrotasks();
};

export const connectCallerSession = async (
  callId: string,
  iceServers: IceServerPayload[] = []
): Promise<void> => {
  await startCallerSession(callId, iceServers);
  dispatchCallSignal({ type: "webrtc_answer", callId, sdp: { type: "answer", sdp: "answer" } });
  callModel.callConnected();
  await settleMicrotasks();
};
