import { createEffect, createEvent, sample } from "effector";

import { showNotification } from "@shared";

import { SCREEN_SHARE_BUSY_MESSAGE } from "./call.helpers";
import {
  $callId,
  $peerMediaState,
  $selfMediaState,
  selfMediaStateChanged,
  toggleScreenShare,
} from "./call.model";
import type { CallMediaState } from "./call.types";
import { sendOverTransport } from "./transport";
import { getDisplayMediaSafe, getSession } from "./webrtc";

export const screenShareEnded = createEvent();

type ScreenShareContext = {
  callId: string | null;
  self: CallMediaState;
  peerSharing: boolean;
};

const broadcast = (callId: string, media: CallMediaState): void => {
  sendOverTransport({
    type: "call_media_state",
    callId,
    micOn: media.micOn,
    cameraOn: media.cameraOn,
    screenSharing: media.screenSharing,
  });
};

const videoSenderOf = (pc: RTCPeerConnection): RTCRtpSender | undefined =>
  pc.getSenders().find((sender) => sender.track?.kind === "video");

const startScreenShareFx = createEffect(
  async ({ callId, self }: ScreenShareContext): Promise<void> => {
    if (!callId) return;
    const session = getSession(callId);
    if (!session) return;

    const screenStream = await getDisplayMediaSafe();
    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack) {
      screenStream.getTracks().forEach((track) => track.stop());
      return;
    }

    const sender = videoSenderOf(session.pc);
    if (sender) await sender.replaceTrack(screenTrack);
    session.screenStream = screenStream;
    screenTrack.addEventListener("ended", () => screenShareEnded());

    const next: CallMediaState = { ...self, screenSharing: true };
    selfMediaStateChanged(next);
    broadcast(callId, next);
  }
);

const stopScreenShareFx = createEffect(
  async ({ callId, self }: ScreenShareContext): Promise<void> => {
    if (!callId) return;
    const session = getSession(callId);
    if (!session) return;

    session.screenStream?.getTracks().forEach((track) => track.stop());
    session.screenStream = null;

    const sender = videoSenderOf(session.pc);
    if (sender) await sender.replaceTrack(session.cameraTrack);

    const next: CallMediaState = { ...self, screenSharing: false };
    selfMediaStateChanged(next);
    broadcast(callId, next);
  }
);

sample({
  clock: toggleScreenShare,
  source: { callId: $callId, self: $selfMediaState, peerSharing: $peerMediaState.map((m) => m.screenSharing) },
  filter: ({ self, peerSharing }) => !self.screenSharing && peerSharing,
  fn: () => ({ message: SCREEN_SHARE_BUSY_MESSAGE?.text ?? "", type: "info" as const }),
  target: showNotification,
});

sample({
  clock: toggleScreenShare,
  source: { callId: $callId, self: $selfMediaState, peerSharing: $peerMediaState.map((m) => m.screenSharing) },
  filter: ({ self, peerSharing }) => !self.screenSharing && !peerSharing,
  target: startScreenShareFx,
});

sample({
  clock: toggleScreenShare,
  source: { callId: $callId, self: $selfMediaState, peerSharing: $peerMediaState.map((m) => m.screenSharing) },
  filter: ({ self }) => self.screenSharing,
  target: stopScreenShareFx,
});

sample({
  clock: screenShareEnded,
  source: { callId: $callId, self: $selfMediaState, peerSharing: $peerMediaState.map((m) => m.screenSharing) },
  filter: ({ self }) => self.screenSharing,
  target: stopScreenShareFx,
});
