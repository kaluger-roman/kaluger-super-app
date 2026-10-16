import type { IceServerPayload } from "./call.types";
import type { CallSession } from "./webrtc.types";

const iceServersByCall = new Map<string, IceServerPayload[]>();

export const rememberIceServers = (callId: string, iceServers: IceServerPayload[]): void => {
  iceServersByCall.set(callId, iceServers);
};

export const getIceServers = (callId: string): IceServerPayload[] =>
  iceServersByCall.get(callId) ?? [];

export const forgetIceServers = (callId: string): void => {
  iceServersByCall.delete(callId);
};

const flushPendingIce = async (session: CallSession): Promise<void> => {
  const pending = session.pendingIce;
  session.pendingIce = [];
  for (const candidate of pending) {
    try {
      await session.pc.addIceCandidate(candidate);
    } catch {
      /* candidate can no longer be applied */
    }
  }
};

export const markRemoteDescriptionSet = async (session: CallSession): Promise<void> => {
  session.remoteDescriptionSet = true;
  await flushPendingIce(session);
};

export const videoSenderOf = (pc: RTCPeerConnection): RTCRtpSender | undefined =>
  pc.getSenders().find((sender) => sender.track?.kind === "video");
