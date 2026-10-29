import { CAMERA_BUSY_TEXT, MIC_AND_CAMERA_BUSY_TEXT, MIC_BUSY_TEXT } from "./call.constants";
import type { CallAddress } from "./call.types";
import { AUDIO_ONLY_CONSTRAINTS, CAMERA_ONLY_CONSTRAINTS } from "./negotiation.constants";
import type { CallDevice, DeviceRequest, TrackRecoveryResult } from "./trackRecovery.types";
import { getSession, getUserMediaSafe } from "./webrtc.helpers";
import type { CallSession } from "./webrtc.types";

const isDeviceBusy = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === "NotReadableError";

// The system may stop the own tracks while the app is in the background (iOS) or when another app
// takes the device. A track the page stopped itself never fires `ended`.
export const watchTrackEnded = (stream: MediaStream, onEnded: () => void): void => {
  stream.getTracks().forEach((track) => track.addEventListener("ended", onEnded));
};

// The shared screen is not brought back: its `ended` stops the share (screenShare.model).
const isEndedCameraOrMic = (session: CallSession, track: MediaStreamTrack): boolean =>
  track.readyState === "ended" && (track.kind === "audio" || track === session.cameraTrack);

const requestDevice = (device: CallDevice): Promise<DeviceRequest> =>
  getUserMediaSafe(device === "mic" ? AUDIO_ONLY_CONSTRAINTS : CAMERA_ONLY_CONSTRAINTS).then(
    (stream) => ({ stream }),
    (error: unknown) => ({ error })
  );

// False when the connection refused the track; the fresh track is stopped then.
const putFreshTrack = async (
  session: CallSession,
  ended: MediaStreamTrack,
  fresh: MediaStreamTrack,
  onEnded: () => void
): Promise<boolean> => {
  fresh.enabled = ended.enabled;
  const sender = session.pc.getSenders().find((candidate) => candidate.track === ended);
  try {
    await sender?.replaceTrack(fresh);
  } catch {
    fresh.stop();
    return false;
  }
  session.localStream?.removeTrack(ended);
  session.localStream?.addTrack(fresh);
  if (ended.kind !== "audio") session.cameraTrack = fresh;
  fresh.addEventListener("ended", onEnded);
  return true;
};

// Gets the stopped microphone and camera again, each on its own: a device another app holds must
// not keep the other one from coming back. A track the user turned off stays off (FR-007): the
// mic and camera toggles keep `enabled` on the stopped track too, even during the request.
export const recoverEndedTracks = async (
  callId: string,
  onEnded: () => void
): Promise<TrackRecoveryResult> => {
  const result: TrackRecoveryResult = { recovered: 0, busy: [] };
  const session = getSession(callId);
  if (!session?.localStream) return result;
  const ended = session.localStream
    .getTracks()
    .filter((track) => isEndedCameraOrMic(session, track));
  for (const track of ended) {
    const device: CallDevice = track.kind === "audio" ? "mic" : "camera";
    const request = await requestDevice(device);
    if ("error" in request) {
      if (isDeviceBusy(request.error)) result.busy.push(device);
      continue;
    }
    const fresh = request.stream.getTracks()[0];
    if (getSession(callId) !== session || !session.localStream) {
      request.stream.getTracks().forEach((stale) => stale.stop());
      return result;
    }
    if (fresh && (await putFreshTrack(session, track, fresh, onEnded))) result.recovered += 1;
  }
  return result;
};

export const getDeviceBusyText = (busy: CallDevice[]): string => {
  if (busy.includes("mic") && busy.includes("camera")) return MIC_AND_CAMERA_BUSY_TEXT;
  return busy.includes("mic") ? MIC_BUSY_TEXT : CAMERA_BUSY_TEXT;
};

export const toRecoveredCallId = ({
  address,
  pending,
}: {
  address: CallAddress | null;
  pending: boolean;
}): string | null => (address && !pending ? address.callId : null);
