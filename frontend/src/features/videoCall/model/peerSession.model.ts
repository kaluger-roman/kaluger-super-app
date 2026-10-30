import { createEffect, createEvent, sample } from "effector";

import * as callModel from "./call.model";
import { wirePeerConnection } from "./peerSession.helpers";
import { getSession, restartSessionPeer } from "./webrtc.helpers";

// The peer's media of the current call arrives in a new stream (the connection was rebuilt).
export const remoteStreamReplaced = createEvent<MediaStream>();
// A track of the peer joined the stream already shown (the stream object stays the same).
export const remoteTrackAdded = createEvent<MediaStreamTrack>();

export const rebuildSessionFx = createEffect((callId: string): MediaStream | null => {
  const session = getSession(callId);
  if (!session) return null;
  return restartSessionPeer(callId, wirePeerConnection(callId, session.role, remoteTrackAdded));
});

sample({
  clock: rebuildSessionFx.doneData,
  filter: (stream): stream is MediaStream => stream !== null,
  target: remoteStreamReplaced,
});
sample({ clock: remoteStreamReplaced, target: callModel.$remoteStream });
