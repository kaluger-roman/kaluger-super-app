import type { CallSession, PeerConnectionWiring, WebRtcAdapter } from "./webrtc.types";

const defaultAdapter: WebRtcAdapter = {
  createPeerConnection: (config) => new RTCPeerConnection(config),
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  getDisplayMedia: () => navigator.mediaDevices.getDisplayMedia({ video: true }),
  supportsDisplayMedia: () => typeof navigator.mediaDevices?.getDisplayMedia === "function",
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

export const getUserMediaSafe = (constraints: MediaStreamConstraints): Promise<MediaStream> =>
  adapter.getUserMedia(constraints);

export const getDisplayMediaSafe = (): Promise<MediaStream> => adapter.getDisplayMedia();

export const isScreenShareSupported = (): boolean => adapter.supportsDisplayMedia();

export const createMediaStreamSafe = (): MediaStream => adapter.createMediaStream();

const sessions = new Map<string, CallSession>();

export const registerSession = (callId: string, session: CallSession): void => {
  sessions.set(callId, session);
};

export const getSession = (callId: string): CallSession | undefined => sessions.get(callId);

export const stopSession = (callId: string): void => {
  const session = sessions.get(callId);
  if (!session) return;
  session.localStream?.getTracks().forEach((track) => track.stop());
  session.screenStream?.getTracks().forEach((track) => track.stop());
  session.pc.close();
  sessions.delete(callId);
};

const detachHandlers = (pc: RTCPeerConnection): void => {
  pc.ontrack = null;
  pc.onicecandidate = null;
  pc.onconnectionstatechange = null;
  pc.oniceconnectionstatechange = null;
};

const addSessionTracks = (
  pc: RTCPeerConnection,
  session: CallSession
): RTCRtpTransceiver | null => {
  const { localStream, screenStream, cameraTrack } = session;
  if (!localStream) return null;
  localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream));
  const screenTrack = screenStream?.getVideoTracks()[0];
  const videoTrack = screenTrack ?? cameraTrack;
  if (!videoTrack) return pc.addTransceiver("video", { direction: "recvonly" });
  const sender = pc.addTrack(videoTrack, screenTrack && screenStream ? screenStream : localStream);
  return pc.getTransceivers().find((transceiver) => transceiver.sender === sender) ?? null;
};

// The peer restarted its connection (reload, another window): a new DTLS session cannot continue
// the old one, so the own side gets a new connection too. The own tracks keep running, and the
// peer's media arrives in a new stream. Resolves with that stream, or null without a session.
// The session object stays the same: work that awaited something meanwhile (media, a screen to
// share) still finds its call and continues on the new connection.
export const restartSessionPeer = (
  callId: string,
  wire: PeerConnectionWiring
): MediaStream | null => {
  const session = sessions.get(callId);
  if (!session) return null;
  detachHandlers(session.pc);
  session.pc.close();

  const pc = createPeerConnection(session.config);
  const remoteStream = createMediaStreamSafe();
  wire(pc, remoteStream);
  Object.assign(session, {
    pc,
    remoteStream,
    videoTransceiver: addSessionTracks(pc, session),
    remoteDescriptionSet: false,
    pendingIce: [],
    makingOffer: false,
    answeringOffer: false,
    offerPending: false,
    ignoreOffer: false,
  } satisfies Partial<CallSession>);
  return remoteStream;
};

export const stopAllSessions = (): void => {
  for (const callId of Array.from(sessions.keys())) {
    stopSession(callId);
  }
};
