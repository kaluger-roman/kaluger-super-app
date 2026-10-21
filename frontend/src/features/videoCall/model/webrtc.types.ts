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
