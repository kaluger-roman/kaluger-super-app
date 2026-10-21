import type { CallMediaState } from "../videoCall.types";
import type { CallCancelReason, CallRole, CallSignalingInbound } from "./signaling.types";

export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "active";

export type CallPeer = {
  name: string;
  role: CallRole;
};

export type IncomingCall = {
  callId: string;
  callerName: string;
  role: CallRole;
};

export type IceServerPayload = {
  urls: string;
  username?: string;
  credential?: string;
};

export type StartCallParams = { studentId: string; peerName: string } | { peerName: string };

export type LocalMediaResult = {
  stream: MediaStream;
  cameraOn: boolean;
};

export type CallSignalTarget = {
  callId: string;
  iceServers: IceServerPayload[];
};

// The socket a call's signals go through, named by the role that call arrived on.
export type CallAddress = {
  callId: string;
  role: CallRole;
};

export type AcceptedCall = CallSignalTarget & CallAddress;

export type LocalMediaParams = CallAddress & {
  iceServers: IceServerPayload[];
  polite: boolean;
};

export type LocalStreams = {
  localStream: MediaStream;
  remoteStream: MediaStream;
};

export type LocalMediaReady = LocalStreams & {
  media: CallMediaState;
};

export type SdpPayload = {
  callId: string;
  sdp: RTCSessionDescriptionInit;
};

export type IcePayload = {
  callId: string;
  candidate: RTCIceCandidateInit;
};

export type OfferParams = SdpPayload &
  CallAddress & {
    iceServers: IceServerPayload[];
  };

export type CallSignalRoutingContext = {
  callId: string | null;
  phase: CallPhase;
  inviteId: string | null;
};

export type MediaToggleContext = {
  callId: string | null;
  media: CallMediaState;
};

export type MediaPatch = Partial<CallMediaState>;

export type CanceledNotice = {
  reason: CallCancelReason;
  callerName: string;
};

// The signal the own side owes the peer when the call ends here; null when the peer ended it.
export type TerminalSignal =
  | { type: "call_reject" }
  | { type: "call_cancel" }
  | { type: "call_hangup"; reason?: "media_unavailable" };

export type TerminatedCall = {
  address: CallAddress | null;
  signal: TerminalSignal | null;
};

export type AddressedSignal = {
  role: CallRole;
  message: CallSignalingInbound;
};

export type InviteParams = {
  call: StartCallParams;
  role: CallRole;
};
