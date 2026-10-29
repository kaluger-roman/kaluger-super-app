import { attach, createEffect, sample } from "effector";

import * as callModel from "./call.model";
import type { CallAddress, ResumeRequest, RestoredCall } from "./call.types";
import * as callEntryModel from "./callEntry.model";
import * as callPresenceModel from "./callPresence.model";
import { secondsSince, toRestoredMedia } from "./callRestore.helpers";
import * as callResumeModel from "./callResume.model";
import * as currentCallModel from "./currentCall.model";
import * as peerConnectionModel from "./peerConnection.model";

const toRestoredCallFx = createEffect((request: ResumeRequest): RestoredCall => ({
  ...request,
  elapsedSeconds: secondsSince(request.snapshot.connectedAt, Date.now()),
}));

// The page has no connection of its own for the call: it builds a new one, and call_resume then
// asks the peer to rebuild its side and make the offer.
const restoreMediaFx = attach({ effect: peerConnectionModel.addLocalMediaFx });

sample({ clock: callEntryModel.resumeRequested, target: toRestoredCallFx });
sample({ clock: toRestoredCallFx.doneData, target: callModel.callRestored });

sample({
  clock: callModel.callRestored,
  fn: ({ snapshot }) => snapshot.peerPresence,
  target: callPresenceModel.peerPresenceReceived,
});
// A change of the peer's presence while this page was away was lost with its socket.
sample({
  clock: callResumeModel.snapshotMatched,
  fn: ({ peerPresence }) => peerPresence,
  target: callPresenceModel.peerPresenceReceived,
});
// Until the new connection is up the peer is out of reach for this page.
sample({
  clock: callModel.callRestored,
  filter: ({ snapshot }) => snapshot.status === "connected",
  fn: () => true,
  target: callPresenceModel.mediaConnectionChanged,
});

// A caller marked as away stays so until call_resume, or its call ends when the wait runs out.
sample({
  clock: callModel.callRestored,
  filter: ({ snapshot }) => snapshot.status === "ringing",
  fn: ({ role, snapshot }): CallAddress => ({ callId: snapshot.callId, role }),
  target: callResumeModel.resumeDue,
});
sample({
  clock: callModel.callRestored,
  filter: ({ snapshot }) => snapshot.status !== "ringing",
  fn: toRestoredMedia,
  target: restoreMediaFx,
});
sample({
  clock: currentCallModel.forCurrentCall(restoreMediaFx.done, ({ params }) => params.callId),
  fn: ({ params: { callId, role } }): CallAddress => ({ callId, role }),
  target: callResumeModel.resumeDue,
});
