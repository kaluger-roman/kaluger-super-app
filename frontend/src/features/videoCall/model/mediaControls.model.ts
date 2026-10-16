import { createEffect, sample } from "effector";

import * as callModel from "./call.model";
import type { CallMediaState, MediaToggleContext } from "./call.types";
import { CAMERA_ONLY_CONSTRAINTS } from "./negotiation.constants";
import { getCameraTrack } from "./negotiation.helpers";
import { videoSenderOf } from "./peerConnection.helpers";
import * as peerConnectionModel from "./peerConnection.model";
import { sendMediaState } from "./transport.helpers";
import { getSession, getUserMediaSafe } from "./webrtc.helpers";

const toggleMicFx = createEffect(({ callId, media }: MediaToggleContext): void => {
  if (!callId) return;
  const session = getSession(callId);
  if (!session?.localStream) return;
  const nextMicOn = !media.micOn;
  session.localStream.getAudioTracks().forEach((track) => {
    track.enabled = nextMicOn;
  });
  const next: CallMediaState = { ...media, micOn: nextMicOn };
  callModel.selfMediaStateChanged(next);
  sendMediaState(callId, next);
});

const toggleCameraFx = createEffect(
  async ({ callId, media }: MediaToggleContext): Promise<void> => {
    if (!callId) return;
    const session = getSession(callId);
    if (!session) return;

    const existingTrack = session.cameraTrack;
    if (existingTrack) {
      const nextCameraOn = !media.cameraOn;
      existingTrack.enabled = nextCameraOn;
      const next: CallMediaState = { ...media, cameraOn: nextCameraOn };
      callModel.selfMediaStateChanged(next);
      sendMediaState(callId, next);
      return;
    }

    const videoStream = await getUserMediaSafe(CAMERA_ONLY_CONSTRAINTS);
    const videoTrack = getCameraTrack(videoStream);
    if (!videoTrack || !session.localStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      return;
    }
    session.localStream.addTrack(videoTrack);
    session.cameraTrack = videoTrack;
    const sender = videoSenderOf(session.pc);
    if (sender) {
      await sender.replaceTrack(videoTrack);
    } else {
      session.pc.addTrack(videoTrack, session.localStream);
      await peerConnectionModel.sendOfferFx(callId);
    }
    const next: CallMediaState = { ...media, cameraOn: true };
    callModel.selfMediaStateChanged(next);
    sendMediaState(callId, next);
  }
);

sample({
  clock: callModel.toggleMic,
  source: { callId: callModel.$callId, media: callModel.$selfMediaState },
  target: toggleMicFx,
});

sample({
  clock: callModel.toggleCamera,
  source: { callId: callModel.$callId, media: callModel.$selfMediaState },
  target: toggleCameraFx,
});
