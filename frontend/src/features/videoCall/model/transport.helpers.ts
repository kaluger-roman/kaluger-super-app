import type { CallMediaState } from "../videoCall.types";
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

export const sendOverTransport = (role: CallRole, message: CallSignalingInbound): boolean => {
  const installed = transports.get(role);
  if (!installed) {
    console.error(`Call transport for ${role} is not initialized`);
    return false;
  }
  installed.send(message);
  return true;
};

export const sendMediaState = (role: CallRole, callId: string, media: CallMediaState): void => {
  sendOverTransport(role, {
    type: "call_media_state",
    callId,
    micOn: media.micOn,
    cameraOn: media.cameraOn,
    screenSharing: media.screenSharing,
    cameraAvailable: media.cameraAvailable,
  });
};
