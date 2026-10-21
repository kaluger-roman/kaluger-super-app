import type { CallMediaState } from "../videoCall.types";
import { NO_TRANSPORT_TEXT } from "./call.constants";
import type {
  CallRole,
  CallSignalingInbound,
  CallTransport,
  InstalledTransport,
} from "./signaling.types";

// A tab may hold both a tutor and a student socket; every signal names the role it goes out on.
const transports = new Map<CallRole, InstalledTransport>();

export const setCallTransport = (role: CallRole, send: CallTransport, owner: unknown): void => {
  transports.set(role, { send, owner });
};

export const clearCallTransport = (owner: unknown): CallRole | null => {
  const entry = Array.from(transports.entries()).find(([, installed]) => installed.owner === owner);
  if (!entry) return null;
  transports.delete(entry[0]);
  return entry[0];
};

export const resetCallTransportsForTests = (): void => {
  transports.clear();
};

export const sendOverTransport = (role: CallRole, message: CallSignalingInbound): void => {
  const installed = transports.get(role);
  if (!installed) throw new Error(NO_TRANSPORT_TEXT);
  installed.send(message);
};

export const toMediaStateMessage = (
  callId: string,
  media: CallMediaState
): CallSignalingInbound => ({
  type: "call_media_state",
  callId,
  micOn: media.micOn,
  cameraOn: media.cameraOn,
  screenSharing: media.screenSharing,
  cameraAvailable: media.cameraAvailable,
});
