import { createEffect, createEvent, sample } from "effector";

import { notificationsModel } from "@shared";

import { SCREEN_SHARE_BUSY_TEXT } from "./call.constants";
import * as callModel from "./call.model";
import type { CallMediaState, ScreenShareContext } from "./call.types";
import { videoSenderOf } from "./peerConnection.helpers";
import { sendMediaState } from "./transport.helpers";
import { getDisplayMediaSafe, getSession } from "./webrtc.helpers";

const screenShareEnded = createEvent();

const $peerSharing = callModel.$peerMediaState.map((media) => media.screenSharing);

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
    callModel.selfMediaStateChanged(next);
    sendMediaState(callId, next);
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
    callModel.selfMediaStateChanged(next);
    sendMediaState(callId, next);
  }
);

const screenShareSource = {
  callId: callModel.$callId,
  self: callModel.$selfMediaState,
  peerSharing: $peerSharing,
};

sample({
  clock: callModel.toggleScreenShare,
  source: screenShareSource,
  filter: ({ self, peerSharing }) => !self.screenSharing && peerSharing,
  fn: () => SCREEN_SHARE_BUSY_TEXT,
  target: notificationsModel.showInfoEvent,
});

sample({
  clock: callModel.toggleScreenShare,
  source: screenShareSource,
  filter: ({ self, peerSharing }) => !self.screenSharing && !peerSharing,
  target: startScreenShareFx,
});

sample({
  clock: [callModel.toggleScreenShare, screenShareEnded],
  source: screenShareSource,
  filter: ({ self }) => self.screenSharing,
  target: stopScreenShareFx,
});
