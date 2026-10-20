import { createEffect, sample } from "effector";

import { notificationsModel } from "@shared";

import type { CallMediaState } from "../videoCall.types";
import { CAMERA_FAILED_TEXT } from "./call.constants";
import * as callModel from "./call.model";
import type { MediaPatch, MediaToggleContext } from "./call.types";
import { CAMERA_ONLY_CONSTRAINTS } from "./negotiation.constants";
import { getCameraTrack } from "./negotiation.helpers";
import { sendVideoTrack } from "./peerConnection.helpers";
import * as peerConnectionModel from "./peerConnection.model";
import { getSession, getUserMediaSafe } from "./webrtc.helpers";

// Each toggle returns the media fields it changed, or null when nothing changed. The patch is
// applied to the state current at the end, so a toggle that finished meanwhile is kept.
const toggleMicFx = createEffect(({ callId, media }: MediaToggleContext): MediaPatch | null => {
  const session = callId ? getSession(callId) : undefined;
  if (!session?.localStream) return null;
  const micOn = !media.micOn;
  session.localStream.getAudioTracks().forEach((track) => {
    track.enabled = micOn;
  });
  return { micOn };
});

const toggleCameraFx = createEffect(
  async ({ callId, media }: MediaToggleContext): Promise<MediaPatch | null> => {
    if (!callId) return null;
    const session = getSession(callId);
    if (!session) return null;

    const existingTrack = session.cameraTrack;
    if (existingTrack) {
      const cameraOn = !media.cameraOn;
      existingTrack.enabled = cameraOn;
      return { cameraOn };
    }

    const videoStream = await getUserMediaSafe(CAMERA_ONLY_CONSTRAINTS);
    const videoTrack = getCameraTrack(videoStream);
    const sessionGone = getSession(callId) !== session || !session.localStream;
    if (!videoTrack || sessionGone || session.cameraTrack) {
      videoStream.getTracks().forEach((track) => track.stop());
      return null;
    }
    session.localStream?.addTrack(videoTrack);
    session.cameraTrack = videoTrack;
    // While the screen is shared the camera waits; stopping the share swaps it back in.
    if (!session.screenStream) {
      try {
        const needsOffer = await sendVideoTrack(session, videoTrack, videoStream);
        if (needsOffer) await peerConnectionModel.sendOfferFx(callId);
      } catch (error) {
        videoTrack.stop();
        session.localStream?.removeTrack(videoTrack);
        session.cameraTrack = null;
        await session.videoTransceiver?.sender.replaceTrack(null);
        throw error;
      }
    }
    return { cameraOn: true, cameraAvailable: true };
  }
);

sample({
  clock: callModel.toggleMic,
  source: { callId: callModel.$callId, media: callModel.$selfMediaState },
  target: toggleMicFx,
});

sample({
  clock: callModel.toggleCamera,
  source: {
    callId: callModel.$callId,
    media: callModel.$selfMediaState,
    pending: toggleCameraFx.pending,
  },
  filter: ({ pending }) => !pending,
  fn: ({ callId, media }) => ({ callId, media }),
  target: toggleCameraFx,
});

const mediaToggled = sample({
  clock: [toggleMicFx.done, toggleCameraFx.done],
  source: callModel.$callId,
  filter: (callId, { params }) => callId === params.callId,
  fn: (_, { result }) => result,
});
sample({
  clock: mediaToggled,
  source: callModel.$selfMediaState,
  filter: (_, patch): patch is MediaPatch => patch !== null,
  fn: (media, patch): CallMediaState => ({ ...media, ...patch }),
  target: callModel.selfMediaStateChanged,
});

// A toggle that failed because its call is already over (e.g. the socket is gone) needs no toast.
sample({
  clock: toggleCameraFx.fail,
  source: callModel.$callId,
  filter: (callId, { params }) => callId === params.callId,
  fn: () => CAMERA_FAILED_TEXT,
  target: notificationsModel.showErrorEvent,
});
