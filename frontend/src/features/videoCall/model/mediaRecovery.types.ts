import type { CallPhase, IncomingCall } from "./call.types";
import type { CallRole, IceServerPayload } from "./signaling.types";

export type PeerStateChange = {
  callId: string;
  state: string;
};

// How the media of the call is doing, from the connection or ICE state.
export type MediaHealth = "up" | "unstable" | "down" | "other";

export type HealthChange = {
  callId: string;
  health: MediaHealth;
};

export type RecoveryCheck = {
  callId: string;
  generation: number;
};

export type IceRestartParams = {
  callId: string;
  // Restart even when the connection looks connected (it failed, or the peer came back).
  force: boolean;
};

export type IceConfigUpdate = {
  callId: string;
  iceServers: IceServerPayload[];
};

export type FirstOfferSource = {
  phase: CallPhase;
  role: CallRole | null;
  iceServers: IceServerPayload[];
  incoming: IncomingCall | null;
};

export type RebuildDone = {
  params: string;
  result: MediaStream | null;
};
