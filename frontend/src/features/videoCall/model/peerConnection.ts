import { createEffect } from "effector";

import {
  callConnected,
  callFailed,
  remoteTrackReceived,
  selfMediaStateChanged,
} from "./call.model";
import type { IceServerPayload } from "./call.types";
import { buildRtcConfiguration } from "./iceConfig";
import {
  acquireLocalMedia,
  getCameraTrack,
  mediaStateOf,
} from "./negotiation.helpers";
import { sendOverTransport } from "./transport";
import {
  createMediaStreamSafe,
  createPeerConnection,
  getSession,
  registerSession,
} from "./webrtc";
import type { CallSession } from "./webrtc";

export const iceServersByCall = new Map<string, IceServerPayload[]>();

export const attachPeerConnection = (
  callId: string,
  iceServers: IceServerPayload[],
  polite: boolean
): RTCPeerConnection => {
  const existing = getSession(callId);
  if (existing) return existing.pc;

  const pc = createPeerConnection(buildRtcConfiguration(iceServers));
  const remoteStream = createMediaStreamSafe();

  pc.ontrack = (event) => {
    event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
    remoteTrackReceived();
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendOverTransport({
        type: "webrtc_ice",
        callId,
        candidate: event.candidate.toJSON(),
      });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
      sendOverTransport({ type: "call_connected", callId });
      callConnected();
    }
    if (pc.connectionState === "failed") {
      sendOverTransport({ type: "call_hangup", callId });
      callFailed(
        "Не удалось установить соединение. Проверьте интернет и попробуйте снова"
      );
    }
  };

  registerSession(callId, {
    pc,
    localStream: null,
    remoteStream,
    cameraTrack: null,
    screenStream: null,
    remoteDescriptionSet: false,
    pendingIce: [],
    polite,
    makingOffer: false,
  });
  return pc;
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

const markRemoteDescriptionSet = async (
  session: CallSession
): Promise<void> => {
  session.remoteDescriptionSet = true;
  await flushPendingIce(session);
};

export const addLocalMediaFx = createEffect(
  async ({
    callId,
    iceServers,
    polite,
  }: {
    callId: string;
    iceServers: IceServerPayload[];
    polite: boolean;
  }): Promise<void> => {
    const pc = attachPeerConnection(callId, iceServers, polite);
    if (getSession(callId)?.localStream) return;
    const { stream, cameraOn } = await acquireLocalMedia();
    const session = getSession(callId);
    if (!session || session.localStream) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    session.localStream = stream;
    session.cameraTrack = getCameraTrack(stream);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    selfMediaStateChanged(mediaStateOf(stream, cameraOn));
  }
);

export const sendOfferFx = createEffect(async (callId: string): Promise<void> => {
  const session = getSession(callId);
  if (!session) return;
  session.makingOffer = true;
  try {
    const offer = await session.pc.createOffer();
    await session.pc.setLocalDescription(offer);
    sendOverTransport({ type: "webrtc_offer", callId, sdp: offer });
  } finally {
    session.makingOffer = false;
  }
});

export const sendAnswerFx = createEffect(
  async ({
    callId,
    sdp,
  }: {
    callId: string;
    sdp: RTCSessionDescriptionInit;
  }): Promise<void> => {
    const session = getSession(callId);
    if (!session) return;

    const offerCollides =
      session.makingOffer || session.pc.signalingState !== "stable";
    if (offerCollides) {
      if (!session.polite) return;
      await session.pc.setLocalDescription({ type: "rollback" });
    }

    await session.pc.setRemoteDescription(sdp);
    await markRemoteDescriptionSet(session);
    const answer = await session.pc.createAnswer();
    await session.pc.setLocalDescription(answer);
    sendOverTransport({ type: "webrtc_answer", callId, sdp: answer });
  }
);

export const applyAnswerFx = createEffect(
  async ({
    callId,
    sdp,
  }: {
    callId: string;
    sdp: RTCSessionDescriptionInit;
  }): Promise<void> => {
    const session = getSession(callId);
    if (!session) return;
    await session.pc.setRemoteDescription(sdp);
    await markRemoteDescriptionSet(session);
  }
);

export const applyIceFx = createEffect(
  async ({
    callId,
    candidate,
  }: {
    callId: string;
    candidate: RTCIceCandidateInit;
  }): Promise<void> => {
    const session = getSession(callId);
    if (!session) return;
    if (!session.remoteDescriptionSet) {
      session.pendingIce.push(candidate);
      return;
    }
    try {
      await session.pc.addIceCandidate(candidate);
    } catch {
      /* ignore late or invalid ICE candidate */
    }
  }
);
