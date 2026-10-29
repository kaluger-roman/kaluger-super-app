import type { LocalMediaParams } from "./call.types";
import { buildRtcConfiguration } from "./iceConfig.helpers";
import type {
  FirstOfferSource,
  HealthChange,
  IceConfigUpdate,
  IceRestartParams,
  MediaHealth,
  PeerStateChange,
  RebuildDone,
} from "./mediaRecovery.types";
import { getSession } from "./webrtc.helpers";

const toMediaHealth = (state: string): MediaHealth => {
  if (state === "connected" || state === "completed") return "up";
  if (state === "disconnected") return "unstable";
  if (state === "failed") return "down";
  return "other";
};

export const toConnectionHealth = ({ callId, state }: PeerStateChange): HealthChange => ({
  callId,
  health: toMediaHealth(state),
});

// Failed ICE fails the connection too: the failure counts once, from the connection state, or
// it would restart ICE twice and send two offers.
export const toIceHealth = ({ callId, state }: PeerStateChange): HealthChange => ({
  callId,
  health: state === "failed" ? "other" : toMediaHealth(state),
});

// Only the caller (the impolite side) restarts ICE, so two restart offers never collide.
// Resolves with true when a restart offer is due.
export const restartIce = async ({ callId, force }: IceRestartParams): Promise<boolean> => {
  const session = getSession(callId);
  // Before the own media is in, the first offer is still to come: there is nothing to restart.
  if (!session?.localStream || session.polite) return false;
  const { pc } = session;
  if (!force && pc.connectionState === "connected") return false;
  // An offer that the peer never answered (it was away) would block the new one.
  if (pc.signalingState === "have-local-offer") {
    await pc.setLocalDescription({ type: "rollback" }).catch((error: unknown) => {
      if (session.pc === pc) throw error;
    });
    // The peer restarted its session meanwhile: the rebuilt connection makes its own offer.
    if (session.pc !== pc) return false;
  }
  pc.restartIce();
  return true;
};

export const updateIceConfig = ({ callId, iceServers }: IceConfigUpdate): void => {
  const session = getSession(callId);
  if (!session || iceServers.length === 0) return;
  const config = buildRtcConfiguration(iceServers);
  session.config = config;
  session.pc.setConfiguration(config);
};

// The callee is the polite side, also when it makes the offer.
export const toFirstOfferParams = (
  { phase, role, iceServers, incoming }: FirstOfferSource,
  { params: callId, result }: RebuildDone
): LocalMediaParams | null =>
  result === null && phase === "connecting" && role
    ? { callId, role, iceServers, polite: incoming !== null }
    : null;
