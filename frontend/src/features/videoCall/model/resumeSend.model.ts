import { createEffect, createStore, sample } from "effector";

import * as callModel from "./call.model";
import { toResumeParams } from "./callResume.helpers";
import * as callResumeModel from "./callResume.model";
import type { ResumeParams, ResumeSent } from "./callResume.types";
import type { CallRole } from "./signaling.types";
import { sendOverTransport, toResumeMessage } from "./transport.helpers";

// A restored call whose new connection the peer has not heard of: written into a socket, a
// call_resume may still die with it, so only the server's call_restart_announced settles it.
const $unannouncedRestart = createStore<string | null>(null);
// Until that confirmation, or the loss of the socket that carries the call_resume, a further
// call_resume must not make the peer rebuild a second time.
const $restartInFlight = createStore<CallRole | null>(null);

export const sendResumeFx = createEffect(
  ({ callId, role, sessionRestart }: ResumeParams): ResumeSent => {
    sendOverTransport(role, toResumeMessage(callId, sessionRestart));
    return { callId, sessionRestart };
  }
);

export const resumeSent = sendResumeFx.doneData;

sample({
  clock: callResumeModel.resumeDue,
  source: { unannouncedRestart: $unannouncedRestart, restartInFlight: $restartInFlight },
  fn: toResumeParams,
  target: sendResumeFx,
});
sample({
  clock: callModel.callRestored,
  filter: ({ snapshot }) => snapshot.status !== "ringing",
  fn: ({ snapshot }) => snapshot.callId,
  target: $unannouncedRestart,
});
sample({
  clock: sendResumeFx.done,
  filter: ({ result }) => result.sessionRestart,
  fn: ({ params }) => params.role,
  target: $restartInFlight,
});
sample({
  clock: [callModel.transportDisconnected, callResumeModel.transportStale],
  source: $restartInFlight,
  filter: (inFlight, lost) => inFlight === lost,
  fn: () => null,
  target: $restartInFlight,
});
sample({
  clock: callResumeModel.restartAnnounced,
  source: $unannouncedRestart,
  filter: (unannounced, callId) => unannounced === callId,
  fn: () => null,
  target: [$unannouncedRestart, $restartInFlight],
});
sample({
  clock: [callModel.callRestored, callModel.callTerminated],
  fn: () => null,
  target: $restartInFlight,
});
sample({ clock: callModel.callTerminated, fn: () => null, target: $unannouncedRestart });
