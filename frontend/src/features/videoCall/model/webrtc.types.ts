import type { CallRole } from "./signaling.types";

export type WebRtcAdapter = {
  createPeerConnection: (config: RTCConfiguration) => RTCPeerConnection;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  getDisplayMedia: () => Promise<MediaStream>;
  supportsDisplayMedia: () => boolean;
  createMediaStream: () => MediaStream;
};

export type CallSession = {
  pc: RTCPeerConnection;
  // Kept for rebuilding the connection after the peer restarted its own.
  config: RTCConfiguration;
  role: CallRole;
  localStream: MediaStream | null;
  remoteStream: MediaStream;
  cameraTrack: MediaStreamTrack | null;
  videoTransceiver: RTCRtpTransceiver | null;
  screenStream: MediaStream | null;
  remoteDescriptionSet: boolean;
  pendingIce: RTCIceCandidateInit[];
  polite: boolean;
  makingOffer: boolean;
  answeringOffer: boolean;
  offerPending: boolean;
  ignoreOffer: boolean;
};

// Puts the event handlers of the call on a (new) connection of the session.
export type PeerConnectionWiring = (pc: RTCPeerConnection, remoteStream: MediaStream) => void;
