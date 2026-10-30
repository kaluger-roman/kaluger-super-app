import { createEffect } from "effector";

import type { IcePayload, LocalMediaParams, LocalMediaReady, SdpPayload } from "./call.types";
import * as callTransportModel from "./callTransport.model";
import { acquireLocalMedia, getCameraTrack, mediaStateOf } from "./negotiation.helpers";
import {
  addIceCandidateSafely,
  ensureVideoTransceiver,
  findVideoTransceiver,
  markRemoteDescriptionSet,
} from "./peerConnection.helpers";
import { attachPeerConnection, wirePeerConnection } from "./peerSession.helpers";
import * as peerSessionModel from "./peerSession.model";
import { getSession } from "./webrtc.helpers";

export const addLocalMediaFx = createEffect(
  async (params: LocalMediaParams): Promise<LocalMediaReady | null> => {
    const { callId, role, polite } = params;
    attachPeerConnection(
      params,
      wirePeerConnection(callId, role, peerSessionModel.remoteTrackAdded)
    );
    if (getSession(callId)?.localStream) return null;
    const { stream, cameraOn } = await acquireLocalMedia();
    // The connection may have been rebuilt meanwhile: the tracks go to the current one.
    const session = getSession(callId);
    if (!session || session.localStream) {
      stream.getTracks().forEach((track) => track.stop());
      return null;
    }
    session.localStream = stream;
    session.cameraTrack = getCameraTrack(stream);
    stream.getTracks().forEach((track) => session.pc.addTrack(track, stream));
    session.videoTransceiver = findVideoTransceiver(session.pc);
    // The caller makes the first offer.
    if (!polite) ensureVideoTransceiver(session);
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
  const { pc } = session;
  // An implicit setLocalDescription during an answer would apply our own answer
  // and swallow the peer's offer; renegotiate once the answer has gone out. An offer still being
  // made has not left "stable" yet: a second one now would reach the peer as two offers.
  if (session.answeringOffer || session.makingOffer || pc.signalingState !== "stable") {
    session.offerPending = true;
    return;
  }
  session.makingOffer = true;
  try {
    // Implicit setLocalDescription builds the offer in the current signaling state,
    // so a glaring remote offer can't slip in between createOffer and applying it.
    await pc.setLocalDescription();
    const offer = pc.localDescription;
    // A rebuild closed this connection meanwhile; the new one makes its own offer.
    if (session.pc !== pc || offer?.type !== "offer") return;
    callTransportModel.signalQueued({
      role: session.role,
      message: { type: "webrtc_offer", callId, sdp: { type: offer.type, sdp: offer.sdp } },
    });
  } catch (error) {
    if (session.pc === pc) throw error;
  } finally {
    // The flag of a rebuilt connection belongs to its own offer.
    if (session.pc === pc) session.makingOffer = false;
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

// The side that makes the first offer of a connection: the caller once the call is accepted, or a
// callee that had no connection yet when the peer restarted its own.
export const sendFirstOfferFx = createEffect(async (params: LocalMediaParams): Promise<void> => {
  await addLocalMediaFx(params);
  const session = getSession(params.callId);
  if (!session) return;
  ensureVideoTransceiver(session);
  await sendOfferFx(params.callId);
});
