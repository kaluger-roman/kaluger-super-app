import { createEffect, sample } from "effector";

import {
  $callId,
  $selfMediaState,
  selfMediaStateChanged,
  toggleCamera,
  toggleMic,
} from "./call.model";
import type { CallMediaState } from "./call.types";
import { getCameraTrack } from "./negotiation.helpers";
import { sendOfferFx } from "./peerConnection";
import { sendOverTransport } from "./transport";
import { getSession, getUserMediaSafe } from "./webrtc";

type ToggleContext = {
  callId: string | null;
  media: CallMediaState;
};

const broadcastMediaState = (callId: string, media: CallMediaState): void => {
  sendOverTransport({
    type: "call_media_state",
    callId,
    micOn: media.micOn,
    cameraOn: media.cameraOn,
    screenSharing: media.screenSharing,
  });
};

const toggleMicFx = createEffect(({ callId, media }: ToggleContext): void => {
  if (!callId) return;
  const session = getSession(callId);
  if (!session?.localStream) return;
  const nextMicOn = !media.micOn;
  session.localStream.getAudioTracks().forEach((track) => {
    track.enabled = nextMicOn;
  });
  const next: CallMediaState = { ...media, micOn: nextMicOn };
  selfMediaStateChanged(next);
  broadcastMediaState(callId, next);
});

const toggleCameraFx = createEffect(
  async ({ callId, media }: ToggleContext): Promise<void> => {
    if (!callId) return;
    const session = getSession(callId);
    if (!session) return;

    const existingTrack = session.cameraTrack;
    if (existingTrack) {
      const nextCameraOn = !media.cameraOn;
      existingTrack.enabled = nextCameraOn;
      const next: CallMediaState = { ...media, cameraOn: nextCameraOn };
      selfMediaStateChanged(next);
      broadcastMediaState(callId, next);
      return;
    }

    const videoStream = await getUserMediaSafe({ video: true, audio: false });
    const videoTrack = getCameraTrack(videoStream);
    if (!videoTrack || !session.localStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      return;
    }
    session.localStream.addTrack(videoTrack);
    session.cameraTrack = videoTrack;
    const sender = session.pc
      .getSenders()
      .find((s) => s.track?.kind === "video");
    if (sender) {
      await sender.replaceTrack(videoTrack);
    } else {
      session.pc.addTrack(videoTrack, session.localStream);
      await sendOfferFx(callId);
    }
    const next: CallMediaState = { ...media, cameraOn: true };
    selfMediaStateChanged(next);
    broadcastMediaState(callId, next);
  }
);

sample({
  clock: toggleMic,
  source: { callId: $callId, media: $selfMediaState },
  target: toggleMicFx,
});

sample({
  clock: toggleCamera,
  source: { callId: $callId, media: $selfMediaState },
  target: toggleCameraFx,
});
