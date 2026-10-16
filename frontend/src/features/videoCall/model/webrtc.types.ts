export type WebRtcAdapter = {
  createPeerConnection: (config: RTCConfiguration) => RTCPeerConnection;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  getDisplayMedia: () => Promise<MediaStream>;
  createMediaStream: () => MediaStream;
};

export type CallSession = {
  pc: RTCPeerConnection;
  localStream: MediaStream | null;
  remoteStream: MediaStream;
  cameraTrack: MediaStreamTrack | null;
  screenStream: MediaStream | null;
  remoteDescriptionSet: boolean;
  pendingIce: RTCIceCandidateInit[];
  polite: boolean;
  makingOffer: boolean;
};
