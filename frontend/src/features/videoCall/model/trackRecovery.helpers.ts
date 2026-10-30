import {
  CAMERA_BUSY_TEXT,
  CAMERA_FAILED_TEXT,
  MIC_AND_CAMERA_BUSY_TEXT,
  MIC_AND_CAMERA_FAILED_TEXT,
  MIC_BUSY_TEXT,
  MIC_FAILED_TEXT,
} from "./call.constants";
import type { CallAddress, MediaPatch } from "./call.types";
import { AUDIO_ONLY_CONSTRAINTS, CAMERA_ONLY_CONSTRAINTS } from "./negotiation.constants";
import type {
  CallDevice,
  DeviceRequest,
  RecoveryRun,
  TrackRecoveryRequest,
  TrackRecoveryResult,
} from "./trackRecovery.types";
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

const toDevice = (track: MediaStreamTrack): CallDevice =>
  track.kind === "audio" ? "mic" : "camera";

// The shared screen is not brought back: its `ended` stops the share (screenShare.model). A skipped
// track comes back only for a toggle of its device.
const isRecoveryTarget = (
  session: CallSession,
  track: MediaStreamTrack,
  toggled: CallDevice[],
  skipped: MediaStreamTrack[]
): boolean => {
  const isToggled = toggled.includes(toDevice(track));
  return (
    (track.kind === "audio" || track === session.cameraTrack) &&
    (isToggled || !skipped.includes(track)) &&
    (track.readyState === "ended" || (isToggled && track.muted && track.enabled))
  );
};

export const selectRecoveryTargets = (
  session: CallSession,
  toggled: CallDevice[],
  skipped: MediaStreamTrack[] = []
): MediaStreamTrack[] =>
  session.localStream
    ?.getTracks()
    .filter((track) => isRecoveryTarget(session, track, toggled, skipped)) ?? [];

const requestDevice = (device: CallDevice): Promise<DeviceRequest> =>
  getUserMediaSafe(device === "mic" ? AUDIO_ONLY_CONSTRAINTS : CAMERA_ONLY_CONSTRAINTS).then(
    (stream) => ({ stream }),
    (error: unknown) => ({ error })
  );

// False when the connection refused the track; the fresh track is stopped then. The replaced
// track is stopped too: a muted one still holds the device.
const putFreshTrack = async (
  session: CallSession,
  replaced: MediaStreamTrack,
  fresh: MediaStreamTrack,
  onEnded: () => void
): Promise<boolean> => {
  fresh.enabled = replaced.enabled;
  const sender = session.pc.getSenders().find((candidate) => candidate.track === replaced);
  try {
    await sender?.replaceTrack(fresh);
  } catch {
    fresh.stop();
    return false;
  }
  // A toggle during the swap flipped the old track, still the one in the stream.
  fresh.enabled = replaced.enabled;
  session.localStream?.removeTrack(replaced);
  session.localStream?.addTrack(fresh);
  if (replaced.kind !== "audio") session.cameraTrack = fresh;
  fresh.addEventListener("ended", onEnded);
  replaced.stop();
  return true;
};

// Gets the stopped microphone and camera again, each on its own: a device another app holds must
// not keep the other one from coming back. A track the user turned off stays off (FR-007): the
// mic and camera toggles keep `enabled` on the stopped track too, even during the request.
export const recoverTracks = async (
  { callId, toggled, skipped }: TrackRecoveryRequest,
  onEnded: () => void
): Promise<TrackRecoveryResult> => {
  const result: TrackRecoveryResult = { recovered: 0, busy: [], failed: [], attempted: [] };
  const session = getSession(callId);
  if (!session?.localStream) return result;
  for (const track of selectRecoveryTargets(session, toggled, skipped)) {
    const device = toDevice(track);
    result.attempted.push(track);
    const request = await requestDevice(device);
    if ("error" in request) {
      if (isDeviceBusy(request.error)) result.busy.push(device);
      else if (toggled.includes(device) && track.enabled) result.failed.push(device);
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

export const getDeviceFailedText = (failed: CallDevice[]): string => {
  if (failed.includes("mic") && failed.includes("camera")) return MIC_AND_CAMERA_FAILED_TEXT;
  return failed.includes("mic") ? MIC_FAILED_TEXT : CAMERA_FAILED_TEXT;
};

export const toToggledDevices = (patch: MediaPatch | null): CallDevice[] => {
  const toggled: CallDevice[] = [];
  if (patch && "micOn" in patch) toggled.push("mic");
  if (patch && "cameraOn" in patch) toggled.push("camera");
  return toggled;
};

export const toRecoveryRequest = (
  address: CallAddress | null,
  toggled: CallDevice[]
): TrackRecoveryRequest | null => (address ? { callId: address.callId, toggled } : null);

// A request that came in during a run waits for it, with the devices toggled meanwhile.
export const queueRecoveryRequest = (
  queued: TrackRecoveryRequest | null,
  next: TrackRecoveryRequest
): TrackRecoveryRequest =>
  queued?.callId === next.callId
    ? {
        callId: next.callId,
        toggled: [
          ...queued.toggled,
          ...next.toggled.filter((device) => !queued.toggled.includes(device)),
        ],
      }
    : next;

export const toReplayedRequest = (
  queued: TrackRecoveryRequest | null,
  { result }: RecoveryRun
): TrackRecoveryRequest | null => (queued ? { ...queued, skipped: result.attempted } : null);

export const isRecoveryRequest = (
  request: TrackRecoveryRequest | null
): request is TrackRecoveryRequest => request !== null;
