import { createEffect, createEvent, sample } from "effector";

import { notificationsModel } from "@shared";

import type { CallMediaState } from "../videoCall.types";
import {
  SCREEN_SHARE_BUSY_TEXT,
  SCREEN_SHARE_FAILED_TEXT,
  SCREEN_SHARE_STOP_FAILED_TEXT,
} from "./call.constants";
import { isPickerDismissed } from "./call.helpers";
import * as callModel from "./call.model";
import * as currentCallModel from "./currentCall.model";
import { findVideoTransceiver, sendVideoTrack } from "./peerConnection.helpers";
import * as peerConnectionModel from "./peerConnection.model";
import { getDisplayMediaSafe, getSession } from "./webrtc.helpers";

const $peerSharing = callModel.$peerMediaState.map((media) => media.screenSharing);
const $selfSharing = callModel.$selfMediaState.map((media) => media.screenSharing);

const screenShareEnded = createEvent();

// Resolves with the shared stream, or null when the share did not start.
const startScreenShareFx = createEffect(
  async (callId: string | null): Promise<MediaStream | null> => {
    if (!callId) return null;
    const session = getSession(callId);
    if (!session?.localStream) return null;

    const screenStream = await getDisplayMediaSafe();
    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack || getSession(callId) !== session || session.screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      return null;
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
    return screenStream;
  }
);

const stopScreenShareFx = createEffect(async (callId: string | null): Promise<boolean> => {
  if (!callId) return false;
  const session = getSession(callId);
  if (!session) return false;

  session.screenStream?.getTracks().forEach((track) => track.stop());
  session.screenStream = null;

  const transceiver = session.videoTransceiver ?? findVideoTransceiver(session.pc);
  if (transceiver) await transceiver.sender.replaceTrack(session.cameraTrack);
  return true;
});

sample({
  clock: callModel.toggleScreenShare,
  source: { selfSharing: $selfSharing, peerSharing: $peerSharing },
  filter: ({ selfSharing, peerSharing }) => !selfSharing && peerSharing,
  fn: () => SCREEN_SHARE_BUSY_TEXT,
  target: notificationsModel.showInfoEvent,
});

sample({
  clock: callModel.toggleScreenShare,
  source: {
    callId: callModel.$callId,
    selfSharing: $selfSharing,
    peerSharing: $peerSharing,
    pending: startScreenShareFx.pending,
  },
  filter: ({ selfSharing, peerSharing, pending }) => !selfSharing && !peerSharing && !pending,
  fn: ({ callId }) => callId,
  target: startScreenShareFx,
});

sample({
  clock: [callModel.toggleScreenShare, screenShareEnded],
  source: { callId: callModel.$callId, selfSharing: $selfSharing },
  filter: ({ selfSharing }) => selfSharing,
  fn: ({ callId }) => callId,
  target: stopScreenShareFx,
});

// A share that finished after its call ended belongs to no call: its tracks are already stopped.
const currentCallShare = sample({
  clock: currentCallModel.forCurrentCall(startScreenShareFx.done, ({ params }) => params),
  fn: ({ result }) => result,
});
const sharingStarted = sample({
  clock: currentCallShare,
  filter: (stream): stream is MediaStream => stream !== null,
});

// A failed stop has already ended the screen tracks, so sharing is over either way.
const sharingStopped = sample({
  clock: [stopScreenShareFx.doneData, stopScreenShareFx.fail.map(() => true)],
  filter: Boolean,
});

sample({ clock: sharingStarted, target: callModel.screenStreamChanged });
sample({ clock: sharingStopped, fn: () => null, target: callModel.screenStreamChanged });
sample({
  clock: sharingStarted,
  source: callModel.$selfMediaState,
  fn: (media): CallMediaState => ({ ...media, screenSharing: true }),
  target: callModel.selfMediaStateChanged,
});
sample({
  clock: sharingStopped,
  source: callModel.$selfMediaState,
  fn: (media): CallMediaState => ({ ...media, screenSharing: false }),
  target: callModel.selfMediaStateChanged,
});

sample({
  clock: stopScreenShareFx.fail,
  fn: () => SCREEN_SHARE_STOP_FAILED_TEXT,
  target: notificationsModel.showErrorEvent,
});

sample({
  clock: startScreenShareFx.failData,
  filter: (error) => !isPickerDismissed(error),
  fn: () => SCREEN_SHARE_FAILED_TEXT,
  target: notificationsModel.showErrorEvent,
});
