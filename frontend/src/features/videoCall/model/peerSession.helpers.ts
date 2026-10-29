import type { LocalMediaParams } from "./call.types";
import * as callTransportModel from "./callTransport.model";
import { buildRtcConfiguration } from "./iceConfig.helpers";
import * as peerStateModel from "./peerState.model";
import type { CallRole } from "./signaling.types";
import {
  createMediaStreamSafe,
  createPeerConnection,
  getSession,
  registerSession,
} from "./webrtc.helpers";
import type { PeerConnectionWiring } from "./webrtc.types";

// WebRTC callbacks fire outside any scope, as the rest of the call flow does.
export const wirePeerConnection =
  (
    callId: string,
    role: CallRole,
    onRemoteTrack: (track: MediaStreamTrack) => void
  ): PeerConnectionWiring =>
  (pc, remoteStream) => {
    pc.ontrack = (event) => {
      // A track replaced into a stream-less transceiver arrives with empty event.streams.
      if (remoteStream.getTrackById(event.track.id)) return;
      remoteStream.addTrack(event.track);
      onRemoteTrack(event.track);
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callTransportModel.signalQueued({
          role,
          message: { type: "webrtc_ice", callId, candidate: event.candidate.toJSON() },
        });
      }
    };
    pc.onconnectionstatechange = () => {
      peerStateModel.connectionStateChanged({ callId, state: pc.connectionState });
    };
    pc.oniceconnectionstatechange = () => {
      peerStateModel.iceStateChanged({ callId, state: pc.iceConnectionState });
    };
  };

// Gives the call a connection unless it already has one.
export const attachPeerConnection = (
  { callId, role, iceServers, polite }: LocalMediaParams,
  wire: PeerConnectionWiring
): void => {
  if (getSession(callId)) return;
  const config = buildRtcConfiguration(iceServers);
  const pc = createPeerConnection(config);
  const remoteStream = createMediaStreamSafe();
  wire(pc, remoteStream);
  registerSession(callId, {
    pc,
    config,
    role,
    localStream: null,
    remoteStream,
    cameraTrack: null,
    videoTransceiver: null,
    screenStream: null,
    remoteDescriptionSet: false,
    pendingIce: [],
    polite,
    makingOffer: false,
    answeringOffer: false,
    offerPending: false,
    ignoreOffer: false,
  });
};
