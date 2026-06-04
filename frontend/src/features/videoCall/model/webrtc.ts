export type WebRtcAdapter = {
  createPeerConnection: (config: RTCConfiguration) => RTCPeerConnection;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  getDisplayMedia: () => Promise<MediaStream>;
  createMediaStream: () => MediaStream;
};

const defaultAdapter: WebRtcAdapter = {
  createPeerConnection: (config) => new RTCPeerConnection(config),
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  getDisplayMedia: () => navigator.mediaDevices.getDisplayMedia({ video: true }),
  createMediaStream: () => new MediaStream(),
};

let adapter: WebRtcAdapter = defaultAdapter;

export const setWebRtcAdapter = (next: WebRtcAdapter): void => {
  adapter = next;
};

export const resetWebRtcAdapter = (): void => {
  adapter = defaultAdapter;
};

export const createPeerConnection = (config: RTCConfiguration): RTCPeerConnection =>
  adapter.createPeerConnection(config);

export const getUserMediaSafe = (
  constraints: MediaStreamConstraints
): Promise<MediaStream> => adapter.getUserMedia(constraints);

export const getDisplayMediaSafe = (): Promise<MediaStream> =>
  adapter.getDisplayMedia();

export const createMediaStreamSafe = (): MediaStream =>
  adapter.createMediaStream();

export type CallSession = {
  pc: RTCPeerConnection;
  localStream: MediaStream | null;
  remoteStream: MediaStream;
  cameraTrack: MediaStreamTrack | null;
  screenStream: MediaStream | null;
  remoteDescriptionSet: boolean;
  pendingIce: RTCIceCandidateInit[];
};

const sessions = new Map<string, CallSession>();

export const registerSession = (callId: string, session: CallSession): void => {
  sessions.set(callId, session);
};

export const getSession = (callId: string): CallSession | undefined =>
  sessions.get(callId);

export const stopSession = (callId: string): void => {
  const session = sessions.get(callId);
  if (!session) return;
  session.localStream?.getTracks().forEach((track) => track.stop());
  session.screenStream?.getTracks().forEach((track) => track.stop());
  try {
    session.pc.close();
  } catch {
    /* peer connection already closed */
  }
  sessions.delete(callId);
};

export const stopAllSessions = (): void => {
  for (const callId of Array.from(sessions.keys())) {
    stopSession(callId);
  }
};
