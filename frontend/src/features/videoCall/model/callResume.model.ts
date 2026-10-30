import { combine, createEffect, createEvent, createStore, sample } from "effector";

import { isAddressedSignal, isCallAddress, toAcceptSignal, toTerminalSignal } from "./call.helpers";
import * as callModel from "./call.model";
import type { AddressedSignal, CallAddress, CallSignalTarget, ResumeRequest } from "./call.types";
import * as callEntryModel from "./callEntry.model";
import * as callPresenceModel from "./callPresence.model";
import {
  decideOnSnapshot,
  isEndedWithoutPage,
  isInviteInDoubt,
  isMediaPhase,
  isMediaResume,
  isOwnCall,
  isSnapshotOfCanceledInvite,
  toEndedSignal,
  toInviteCancel,
  toMatchedSnapshot,
  toMissedAcceptance,
  toReplacement,
  toRestoreRequest,
  toResumeAddress,
  toUnsentAccept,
} from "./callResume.helpers";
import type {
  CallStateReceived,
  DecidedSnapshot,
  PeerResumed,
  SnapshotContext,
  TakenElsewhere,
} from "./callResume.types";
import * as devicePushModel from "./devicePush.model";
import type { CallRole, CallSnapshot } from "./signaling.types";
import { sendOverTransport } from "./transport.helpers";

// The socket of the call's role is gone while the call goes on (banner «Восстанавливаем связь…»).
export const $isOwnTransportLost = createStore(false);
// Our invite went out on a socket that closed before call_ringing: only a snapshot tells its fate.
const $inviteInDoubt = createStore(false);
// Such an invite canceled before its snapshot came: the callee may still ring (role of the invite).
const $canceledInvite = createStore<CallRole | null>(null);
const $endedCall = createStore<AddressedSignal | null>(null);
// The participant's newer call that replaces the page's one: it is restored only once the page's
// call has ended, or the reset of the ended call would wipe it.
const $replacement = createStore<ResumeRequest | null>(null);
const $localCall = combine({
  callId: callModel.$callId,
  phase: callModel.$callPhase,
  role: callModel.$callRole,
  inviteInDoubt: $inviteInDoubt,
  canceledInvite: $canceledInvite,
  endedCall: $endedCall,
});

export const callStateReceived = createEvent<CallStateReceived>();
export const peerResumed = createEvent<PeerResumed>();
// The server asked the peer to rebuild for the restored connection of this call (callId).
export const restartAnnounced = createEvent<string>();
// The server took the page back into the call (callId): call_resume without a session restart.
export const resumed = createEvent<string>();
// The server has to hear that this page holds the call (call_resume).
export const resumeDue = createEvent<CallAddress>();
// The socket of the role looks open but did not answer: it has to be opened again.
export const transportStale = createEvent<CallRole>();
// The socket of the role waits for a call held by another window of the same user.
export const transportWaiting = createEvent<CallRole>();
// Another tab or device took the connection of the role (or kept it from this tab's reconnect).
export const transportTakenElsewhere = createEvent<TakenElsewhere>();
// The page came back to a call that ended without it.
export const returnedToEndedCall = createEvent();
// The server's snapshot of the call this page still holds.
export const snapshotMatched = createEvent<CallSnapshot>();

// Best effort: the server ignores a signal for a call it no longer has.
const resendSignalFx = createEffect(({ role, message }: AddressedSignal): void => {
  sendOverTransport(role, message);
});

const decided = sample({
  clock: callStateReceived,
  source: $localCall,
  fn: (local: SnapshotContext, received): DecidedSnapshot => ({
    local,
    received,
    decision: decideOnSnapshot(local, received),
  }),
});
sample({
  clock: decided.map(toRestoreRequest),
  filter: (request): request is ResumeRequest => request !== null,
  target: callEntryModel.resumeRequested,
});
sample({
  clock: decided.map(toReplacement),
  filter: (request): request is ResumeRequest => request !== null,
  target: $replacement,
});
sample({
  clock: $replacement.updates,
  filter: Boolean,
  fn: () => undefined,
  target: [callModel.callEndedLocally, returnedToEndedCall],
});
const replacementDue = sample({
  clock: sample({ clock: callModel.callTerminated, source: $replacement }),
  filter: (request): request is ResumeRequest => request !== null,
});
sample({ clock: replacementDue, target: callEntryModel.resumeRequested });
sample({ clock: replacementDue, fn: () => null, target: $replacement });
sample({
  clock: decided.map(toResumeAddress),
  filter: (address): address is CallAddress => address !== null,
  target: resumeDue,
});
sample({
  clock: decided.map(toMatchedSnapshot),
  filter: (snapshot): snapshot is CallSnapshot => snapshot !== null,
  target: snapshotMatched,
});
sample({
  clock: decided.map(toMissedAcceptance),
  filter: (accepted): accepted is CallSignalTarget => accepted !== null,
  target: callModel.callAcceptedReceived,
});
// All come from one snapshot: one sample each, or an empty one would overwrite the other.
sample({
  clock: sample({ clock: decided.map(toUnsentAccept), filter: isCallAddress }),
  source: devicePushModel.$pushEndpoint,
  fn: toAcceptSignal,
  target: resendSignalFx,
});
sample({ clock: decided.map(toEndedSignal), filter: isAddressedSignal, target: resendSignalFx });
sample({ clock: decided.map(toInviteCancel), filter: isAddressedSignal, target: resendSignalFx });
sample({
  clock: decided,
  source: { media: callModel.$selfMediaState, ready: callModel.$localMediaReady },
  filter: ({ ready }, snapshot) => ready && isMediaResume(snapshot),
  fn: ({ media }) => media,
  target: callModel.selfMediaStateChanged,
});
// The peer's page is back (a reload starts it from the defaults): what this side switched while
// the peer's socket was gone never reached it.
sample({
  clock: peerResumed,
  source: {
    media: callModel.$selfMediaState,
    ready: callModel.$localMediaReady,
    phase: callModel.$callPhase,
  },
  filter: ({ ready, phase }) => ready && isMediaPhase(phase),
  fn: ({ media }) => media,
  target: callModel.selfMediaStateChanged,
});
const endedWithoutPage = sample({
  clock: decided,
  filter: isEndedWithoutPage,
  fn: () => undefined,
});

sample({
  clock: callModel.callTerminated.map(toTerminalSignal),
  filter: isAddressedSignal,
  target: $endedCall,
});

sample({
  clock: callModel.transportDisconnected,
  source: $localCall,
  filter: isInviteInDoubt,
  fn: () => true,
  target: $inviteInDoubt,
});
sample({
  clock: [callModel.callRinging, callModel.callRestored, callModel.callTerminated],
  fn: () => false,
  target: $inviteInDoubt,
});
// Read before the cancel resets the call. The canceled invite never gets its call_ringing, which
// would cancel it as stale (callSignals.model): the next snapshot of its role does instead.
sample({
  clock: callModel.cancelCall,
  source: $localCall,
  filter: ({ inviteInDoubt }) => inviteInDoubt,
  fn: ({ role }) => role,
  target: $canceledInvite,
});
sample({
  clock: decided,
  filter: isSnapshotOfCanceledInvite,
  fn: () => null,
  target: $canceledInvite,
});
// A new invite replaces a still ringing one on the server.
sample({ clock: callModel.callStarted, fn: () => null, target: $canceledInvite });

sample({
  clock: callModel.transportDisconnected,
  source: $localCall,
  filter: isOwnCall,
  fn: () => true,
  target: $isOwnTransportLost,
});
sample({
  clock: callPresenceModel.transportReady,
  source: callModel.$callRole,
  filter: (role, ready) => role === ready,
  fn: () => false,
  target: $isOwnTransportLost,
});
sample({ clock: callModel.callTerminated, fn: () => false, target: $isOwnTransportLost });

sample({ clock: endedWithoutPage, target: [callModel.callEndedLocally, returnedToEndedCall] });
