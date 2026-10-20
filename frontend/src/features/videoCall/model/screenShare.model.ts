import { createEffect, createEvent, sample } from "effector";

import { notificationsModel } from "@shared";

import type { CallMediaState } from "../videoCall.types";
import { SCREEN_SHARE_BUSY_TEXT, SCREEN_SHARE_FAILED_TEXT } from "./call.constants";
import { isPickerDismissed } from "./call.helpers";
import * as callModel from "./call.model";
import type { ScreenShareContext } from "./call.types";
import { findVideoTransceiver, sendVideoTrack } from "./peerConnection.helpers";
import * as peerConnectionModel from "./peerConnection.model";
import { getDisplayMediaSafe, getSession } from "./webrtc.helpers";

const $peerSharing = callModel.$peerMediaState.map((media) => media.screenSharing);

const screenShareEnded = createEvent();

const startScreenShareFx = createEffect(
  async ({ callId }: ScreenShareContext): Promise<boolean> => {
    if (!callId) return false;
    const session = getSession(callId);
    if (!session) return false;

    const screenStream = await getDisplayMediaSafe();
    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack || getSession(callId) !== session || session.screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      return false;
    }

    session.screenStream = screenStream;
    screenTrack.addEventListener("ended", () => screenShareEnded());
    try {
      const needsOffer = await sendVideoTrack(session, screenTrack, screenStream);
      if (needsOffer) await peerConnectionModel.sendOfferFx(callId);
    } catch (error) {
      screenStream.getTracks().forEach((track) => track.stop());
      session.screenStream = null;
      await session.videoTransceiver?.sender.replaceTrack(session.cameraTrack);
      throw error;
    }
    return true;
  }
);

const stopScreenShareFx = createEffect(async ({ callId }: ScreenShareContext): Promise<boolean> => {
  if (!callId) return false;
  const session = getSession(callId);
  if (!session) return false;

  session.screenStream?.getTracks().forEach((track) => track.stop());
  session.screenStream = null;

  const transceiver = session.videoTransceiver ?? findVideoTransceiver(session.pc);
  if (transceiver) await transceiver.sender.replaceTrack(session.cameraTrack);
  return true;
});

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
  source: {
    callId: callModel.$callId,
    self: callModel.$selfMediaState,
    peerSharing: $peerSharing,
    pending: startScreenShareFx.pending,
  },
  filter: ({ self, peerSharing, pending }) => !self.screenSharing && !peerSharing && !pending,
  fn: ({ callId, self, peerSharing }) => ({ callId, self, peerSharing }),
  target: startScreenShareFx,
});

sample({
  clock: [callModel.toggleScreenShare, screenShareEnded],
  source: screenShareSource,
  filter: ({ self }) => self.screenSharing,
  target: stopScreenShareFx,
});

const sharingStarted = sample({
  clock: startScreenShareFx.doneData,
  source: callModel.$selfMediaState,
  filter: (_, started) => started,
  fn: (media): CallMediaState => ({ ...media, screenSharing: true }),
});

const sharingStopped = sample({
  clock: [stopScreenShareFx.doneData, stopScreenShareFx.fail.map(() => true)],
  source: callModel.$selfMediaState,
  filter: (_, stopped) => stopped,
  fn: (media): CallMediaState => ({ ...media, screenSharing: false }),
});

sample({ clock: [sharingStarted, sharingStopped], target: callModel.selfMediaStateChanged });
sample({
  clock: [sharingStarted, sharingStopped],
  source: callModel.$callId,
  fn: (callId, media) => ({ callId, media }),
  target: peerConnectionModel.sendMediaStateFx,
});

sample({
  clock: startScreenShareFx.failData,
  filter: (error) => !isPickerDismissed(error),
  fn: () => SCREEN_SHARE_FAILED_TEXT,
  target: notificationsModel.showErrorEvent,
});
