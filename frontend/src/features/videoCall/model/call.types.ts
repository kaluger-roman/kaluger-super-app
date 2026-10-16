import type { CallMediaState } from "../videoCall.types";

export type CallPhase = "idle" | "outgoing" | "incoming" | "active";

export type CallPeer = {
  id: string;
  name: string;
  role: "tutor" | "student";
};

export type IncomingCall = {
  callId: string;
  callerName: string;
};

type CallStatusKind = "info" | "error";

export type CallStatusMessage = {
  kind: CallStatusKind;
  text: string;
} | null;

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

export type LocalMediaParams = CallSignalTarget & {
  polite: boolean;
};

export type SdpPayload = {
  callId: string;
  sdp: RTCSessionDescriptionInit;
};

export type IcePayload = {
  callId: string;
  candidate: RTCIceCandidateInit;
};

export type MediaToggleContext = {
  callId: string | null;
  media: CallMediaState;
};

export type ScreenShareContext = {
  callId: string | null;
  self: CallMediaState;
  peerSharing: boolean;
};

export type { CallMediaState };
