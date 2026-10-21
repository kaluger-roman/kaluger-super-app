import { createEffect } from "effector";

import { CONNECTION_FAILED_TEXT } from "./call.constants";
import * as callModel from "./call.model";
import type {
  IcePayload,
  IceServerPayload,
  LocalMediaParams,
  LocalMediaReady,
  SdpPayload,
} from "./call.types";
import * as callTransportModel from "./callTransport.model";
import { buildRtcConfiguration } from "./iceConfig.helpers";
import { acquireLocalMedia, getCameraTrack, mediaStateOf } from "./negotiation.helpers";
import {
  addIceCandidateSafely,
  findVideoTransceiver,
  markRemoteDescriptionSet,
} from "./peerConnection.helpers";
import type { CallRole } from "./signaling.types";
import {
  createMediaStreamSafe,
  createPeerConnection,
  getSession,
  registerSession,
} from "./webrtc.helpers";

const attachPeerConnection = (
  callId: string,
  role: CallRole,
  iceServers: IceServerPayload[],
  polite: boolean
): RTCPeerConnection => {
  const existing = getSession(callId);
  if (existing) return existing.pc;

  const pc = createPeerConnection(buildRtcConfiguration(iceServers));
  const remoteStream = createMediaStreamSafe();

  pc.ontrack = (event) => {
    // A track replaced into a stream-less transceiver arrives with empty event.streams.
    if (!remoteStream.getTrackById(event.track.id)) remoteStream.addTrack(event.track);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      callTransportModel.signalQueued({
        role,
        message: { type: "webrtc_ice", callId, candidate: event.candidate.toJSON() },
      });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
      callTransportModel.signalQueued({ role, message: { type: "call_connected", callId } });
      callModel.callConnected();
    }
    if (pc.connectionState === "failed") {
      callModel.callFailed(CONNECTION_FAILED_TEXT);
    }
  };

  registerSession(callId, {
    pc,
    role,
    localStream: null,
    remoteStream,
    cameraTrack: null,
    videoTransceiver: null,
    screenStream: null,
    remoteDescriptionSet: false,
    pendingIce: [],
    polite,
    makingOffer: false,
    answeringOffer: false,
    offerPending: false,
    ignoreOffer: false,
  });
  return pc;
};

export const addLocalMediaFx = createEffect(
  async ({
    callId,
    role,
    iceServers,
    polite,
  }: LocalMediaParams): Promise<LocalMediaReady | null> => {
    const pc = attachPeerConnection(callId, role, iceServers, polite);
    if (getSession(callId)?.localStream) return null;
    const { stream, cameraOn } = await acquireLocalMedia();
    const session = getSession(callId);
    if (!session || session.localStream) {
      stream.getTracks().forEach((track) => track.stop());
      return null;
    }
    session.localStream = stream;
    session.cameraTrack = getCameraTrack(stream);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    session.videoTransceiver = findVideoTransceiver(pc);
    // Without a video m-line in the caller's offer the callee's camera could never be sent.
    if (!polite && !session.videoTransceiver) {
      session.videoTransceiver = pc.addTransceiver("video", { direction: "recvonly" });
    }
    return {
      media: mediaStateOf(stream, cameraOn),
      localStream: stream,
      remoteStream: session.remoteStream,
    };
  }
);

export const sendOfferFx = createEffect(async (callId: string): Promise<void> => {
  const session = getSession(callId);
  if (!session) return;
  // An implicit setLocalDescription during an answer would apply our own answer
  // and swallow the peer's offer; renegotiate once the answer has gone out.
  if (session.answeringOffer || session.pc.signalingState !== "stable") {
    session.offerPending = true;
    return;
  }
  session.makingOffer = true;
  try {
    // Implicit setLocalDescription builds the offer in the current signaling state,
    // so a glaring remote offer can't slip in between createOffer and applying it.
    await session.pc.setLocalDescription();
    const offer = session.pc.localDescription;
    if (offer?.type !== "offer") return;
    callTransportModel.signalQueued({
      role: session.role,
      message: { type: "webrtc_offer", callId, sdp: { type: offer.type, sdp: offer.sdp } },
    });
  } finally {
    session.makingOffer = false;
  }
});

export const sendAnswerFx = createEffect(async ({ callId, sdp }: SdpPayload): Promise<void> => {
  const session = getSession(callId);
  if (!session) return;

  const offerCollides = session.makingOffer || session.pc.signalingState !== "stable";
  // Perfect negotiation: the impolite side ignores a colliding offer and its candidates.
  session.ignoreOffer = offerCollides && !session.polite;
  if (session.ignoreOffer) return;

  session.answeringOffer = true;
  try {
    // setRemoteDescription rolls back our pending offer implicitly; an explicit rollback
    // throws while createOffer is still running and signalingState is "stable".
    await session.pc.setRemoteDescription(sdp);
    await markRemoteDescriptionSet(session);
    const answer = await session.pc.createAnswer();
    await session.pc.setLocalDescription(answer);
    callTransportModel.signalQueued({
      role: session.role,
      message: { type: "webrtc_answer", callId, sdp: answer },
    });
  } finally {
    session.answeringOffer = false;
  }
  if (offerCollides || session.offerPending) {
    session.offerPending = false;
    await sendOfferFx(callId);
  }
});

export const applyAnswerFx = createEffect(async ({ callId, sdp }: SdpPayload): Promise<void> => {
  const session = getSession(callId);
  if (!session) return;
  await session.pc.setRemoteDescription(sdp);
  await markRemoteDescriptionSet(session);
  if (session.offerPending) {
    session.offerPending = false;
    await sendOfferFx(callId);
  }
});

export const applyIceFx = createEffect(async ({ callId, candidate }: IcePayload): Promise<void> => {
  const session = getSession(callId);
  if (!session) return;
  if (!session.remoteDescriptionSet) {
    session.pendingIce.push(candidate);
    return;
  }
  await addIceCandidateSafely(session, candidate);
});
