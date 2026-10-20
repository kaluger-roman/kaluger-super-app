import type { CallSession } from "./webrtc.types";

const flushPendingIce = async (session: CallSession): Promise<void> => {
  const pending = session.pendingIce;
  session.pendingIce = [];
  for (const candidate of pending) {
    try {
      await session.pc.addIceCandidate(candidate);
    } catch {
      /* candidate can no longer be applied */
    }
  }
};

export const markRemoteDescriptionSet = async (session: CallSession): Promise<void> => {
  session.remoteDescriptionSet = true;
  await flushPendingIce(session);
};

export const findVideoTransceiver = (pc: RTCPeerConnection): RTCRtpTransceiver | null =>
  pc
    .getTransceivers()
    .find(
      (transceiver) =>
        transceiver.receiver.track?.kind === "video" || transceiver.sender.track?.kind === "video"
    ) ?? null;

// Reuses the one video m-line for camera and screen so toggling never adds transceivers.
// Returns true when the transceiver started sending and the session must renegotiate.
export const sendVideoTrack = async (
  session: CallSession,
  track: MediaStreamTrack,
  stream: MediaStream
): Promise<boolean> => {
  const transceiver = session.videoTransceiver ?? findVideoTransceiver(session.pc);
  if (!transceiver) {
    const sender = session.pc.addTrack(track, stream);
    session.videoTransceiver =
      session.pc.getTransceivers().find((candidate) => candidate.sender === sender) ?? null;
    return true;
  }
  session.videoTransceiver = transceiver;
  await transceiver.sender.replaceTrack(track);
  transceiver.direction = "sendrecv";
  // A failed renegotiation leaves direction "sendrecv" while the negotiated one is still
  // "recvonly", so the decision must follow currentDirection.
  const negotiated = transceiver.currentDirection;
  return negotiated !== "sendrecv" && negotiated !== "sendonly";
};
