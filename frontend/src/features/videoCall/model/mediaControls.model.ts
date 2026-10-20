import { createEffect, sample } from "effector";

import { notificationsModel } from "@shared";

import type { CallMediaState } from "../videoCall.types";
import { CAMERA_FAILED_TEXT } from "./call.constants";
import * as callModel from "./call.model";
import type { CameraToggleResult, MediaToggleContext } from "./call.types";
import { CAMERA_ONLY_CONSTRAINTS } from "./negotiation.constants";
import { getCameraTrack } from "./negotiation.helpers";
import { sendVideoTrack } from "./peerConnection.helpers";
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
  async ({ callId, media }: MediaToggleContext): Promise<CameraToggleResult> => {
    if (!callId) return "unchanged";
    const session = getSession(callId);
    if (!session) return "unchanged";

    const existingTrack = session.cameraTrack;
    if (existingTrack) {
      const nextCameraOn = !media.cameraOn;
      existingTrack.enabled = nextCameraOn;
      const next: CallMediaState = { ...media, cameraOn: nextCameraOn };
      callModel.selfMediaStateChanged(next);
      sendMediaState(callId, next);
      return "unchanged";
    }

    const videoStream = await getUserMediaSafe(CAMERA_ONLY_CONSTRAINTS);
    const videoTrack = getCameraTrack(videoStream);
    const sessionGone = getSession(callId) !== session || !session.localStream;
    if (!videoTrack || sessionGone || session.cameraTrack) {
      videoStream.getTracks().forEach((track) => track.stop());
      return "unchanged";
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
    return "enabled";
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

const cameraEnabled = sample({
  clock: toggleCameraFx.doneData,
  source: callModel.$selfMediaState,
  filter: (_, result) => result === "enabled",
  fn: (media): CallMediaState => ({ ...media, cameraOn: true, cameraAvailable: true }),
});

sample({ clock: cameraEnabled, target: callModel.selfMediaStateChanged });
sample({
  clock: cameraEnabled,
  source: callModel.$callId,
  fn: (callId, media) => ({ callId, media }),
  target: peerConnectionModel.sendMediaStateFx,
});

sample({
  clock: toggleCameraFx.fail,
  fn: () => CAMERA_FAILED_TEXT,
  target: notificationsModel.showErrorEvent,
});
