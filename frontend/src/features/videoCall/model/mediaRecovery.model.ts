import { createEffect, createStore, sample } from "effector";
import { delay } from "patronum";

import { CONNECTION_FAILED_TEXT } from "./call.constants";
import { isCallAddress } from "./call.helpers";
import * as callModel from "./call.model";
import type { AddressedSignal, LocalMediaParams } from "./call.types";
import * as callPresenceModel from "./callPresence.model";
import * as callResumeModel from "./callResume.model";
import * as callTransportModel from "./callTransport.model";
import { ICE_DISCONNECTED_RESTART_MS, MEDIA_RECOVERY_TIMEOUT_MS } from "./mediaRecovery.constants";
import {
  restartIce,
  toConnectionHealth,
  toFirstOfferParams,
  toIceHealth,
  updateIceConfig,
} from "./mediaRecovery.helpers";
import type { IceRestartParams, RecoveryCheck } from "./mediaRecovery.types";
import * as peerConnectionModel from "./peerConnection.model";
import * as peerSessionModel from "./peerSession.model";
import * as peerStateModel from "./peerState.model";
import * as resumeSendModel from "./resumeSend.model";

// patronum `delay` cannot be cancelled: delayed checks count only for the current generation.
const $iceCheckGeneration = createStore(0);
const $lossGeneration = createStore(0);

const restartIceFx = createEffect(restartIce);
const updateIceConfigFx = createEffect(updateIceConfig);

const connected = sample({
  clock: peerStateModel.connectionStateChanged,
  source: callModel.$callAddress,
  filter: (address, { callId, state }) => address?.callId === callId && state === "connected",
  fn: (address) => address,
});
sample({
  clock: connected,
  filter: isCallAddress,
  fn: ({ callId, role }): AddressedSignal => ({
    role,
    message: { type: "call_connected", callId },
  }),
  target: callTransportModel.signalQueued,
});
sample({ clock: connected, fn: () => undefined, target: callModel.callConnected });

// A connection that never came up cannot be recovered (FR-008a).
sample({
  clock: peerStateModel.connectionStateChanged,
  source: { callId: callModel.$callId, phase: callModel.$callPhase },
  filter: ({ callId, phase }, change) =>
    callId === change.callId && phase === "connecting" && change.state === "failed",
  fn: () => CONNECTION_FAILED_TEXT,
  target: callModel.callFailed,
});

const healthChanged = sample({
  clock: [
    peerStateModel.connectionStateChanged.map(toConnectionHealth),
    peerStateModel.iceStateChanged.map(toIceHealth),
  ],
  source: { callId: callModel.$callId, phase: callModel.$callPhase },
  filter: ({ callId, phase }, change) => phase === "active" && callId === change.callId,
  fn: (_, change) => change,
});
const mediaUp = sample({ clock: healthChanged, filter: ({ health }) => health === "up" });
const mediaDown = sample({ clock: healthChanged, filter: ({ health }) => health === "down" });
const mediaUnstable = sample({
  clock: healthChanged,
  filter: ({ health }) => health === "unstable",
});

sample({ clock: mediaUp, fn: () => false, target: callPresenceModel.mediaConnectionChanged });
sample({ clock: mediaDown, fn: () => true, target: callPresenceModel.mediaConnectionChanged });
sample({
  clock: mediaDown,
  fn: ({ callId }): IceRestartParams => ({ callId, force: true }),
  target: restartIceFx,
});

const iceCheckStarted = sample({
  clock: mediaUnstable,
  source: $iceCheckGeneration,
  fn: (generation, { callId }): RecoveryCheck => ({ callId, generation: generation + 1 }),
});
sample({ clock: iceCheckStarted, fn: ({ generation }) => generation, target: $iceCheckGeneration });
sample({
  clock: [mediaUp, mediaDown, callModel.callTerminated],
  source: $iceCheckGeneration,
  fn: (generation) => generation + 1,
  target: $iceCheckGeneration,
});
const stillUnstable = sample({
  clock: delay({ source: iceCheckStarted, timeout: ICE_DISCONNECTED_RESTART_MS }),
  source: $iceCheckGeneration,
  filter: (generation, check) => generation === check.generation,
  fn: (_, { callId }) => callId,
});
sample({ clock: stillUnstable, fn: () => true, target: callPresenceModel.mediaConnectionChanged });
sample({
  clock: stillUnstable,
  fn: (callId): IceRestartParams => ({ callId, force: false }),
  target: restartIceFx,
});

// Back on the server, the caller restarts ICE if the media did not survive the break.
sample({
  clock: [resumeSendModel.resumeSent, callResumeModel.peerResumed],
  source: callModel.$callId,
  filter: (callId, resumed) => callId === resumed.callId && !resumed.sessionRestart,
  fn: (_, { callId }): IceRestartParams => ({ callId, force: false }),
  target: restartIceFx,
});
sample({
  clock: restartIceFx.done,
  filter: ({ result }) => result,
  fn: ({ params }) => params.callId,
  target: peerConnectionModel.sendOfferFx,
});

// The peer has a new connection: this side rebuilds its own and makes the offer, since only it
// knows when the new connection is ready.
const peerRestarted = sample({
  clock: callResumeModel.peerResumed,
  source: { callId: callModel.$callId, phase: callModel.$callPhase },
  filter: ({ callId }, { callId: resumed, sessionRestart }) => sessionRestart && callId === resumed,
  fn: ({ phase }, { callId }) => ({ callId, phase }),
});
sample({
  clock: peerRestarted,
  fn: ({ callId }) => callId,
  target: peerSessionModel.rebuildSessionFx,
});
sample({
  clock: peerRestarted,
  filter: ({ phase }) => phase === "active",
  fn: () => true,
  target: callPresenceModel.mediaConnectionChanged,
});
sample({
  clock: peerSessionModel.rebuildSessionFx.done,
  filter: ({ result }) => result !== null,
  fn: ({ params }) => params,
  target: peerConnectionModel.sendOfferFx,
});
// A callee that accepted but got no offer yet has no connection to rebuild: it builds one and
// makes the offer itself, or nobody would.
sample({
  clock: sample({
    clock: peerSessionModel.rebuildSessionFx.done,
    source: {
      phase: callModel.$callPhase,
      role: callModel.$callRole,
      iceServers: callModel.$iceServers,
      incoming: callModel.$incomingCall,
    },
    fn: toFirstOfferParams,
  }),
  filter: (params): params is LocalMediaParams => params !== null,
  target: peerConnectionModel.sendFirstOfferFx,
});

sample({
  clock: callResumeModel.snapshotMatched,
  fn: ({ callId, iceServers }) => ({ callId, iceServers }),
  target: updateIceConfigFx,
});

// Media that stays lost through the whole grace period ends the call.
const lossStarted = sample({
  clock: callPresenceModel.$mediaConnectionLost.updates,
  source: $lossGeneration,
  filter: (_, lost) => lost,
  fn: (generation) => generation + 1,
});
sample({ clock: lossStarted, target: $lossGeneration });
sample({
  clock: callModel.callTerminated,
  source: $lossGeneration,
  fn: (generation) => generation + 1,
  target: $lossGeneration,
});
sample({
  clock: delay({ source: lossStarted, timeout: MEDIA_RECOVERY_TIMEOUT_MS }),
  source: { lost: callPresenceModel.$mediaConnectionLost, generation: $lossGeneration },
  filter: ({ lost, generation }, started) => lost && generation === started,
  fn: () => CONNECTION_FAILED_TEXT,
  target: callModel.callFailed,
});
