import type { CallMediaState } from "../videoCall.types";
import type {
  CallRole,
  CallSignalingInbound,
  CallTransport,
  InstalledTransport,
} from "./signaling.types";

// A tab may hold both a tutor and a student socket. Each call signal goes out
// through the socket its call arrived on (or, for an invite, the caller's role).
const transports = new Map<CallRole, InstalledTransport>();
const roleByCallId = new Map<string, CallRole>();
let inviteRole: CallRole | null = null;

export const setCallTransport = (
  next: CallTransport | null,
  owner: unknown = null,
  role: CallRole = "tutor"
): void => {
  if (next) {
    transports.set(role, { send: next, owner });
  } else {
    transports.clear();
    roleByCallId.clear();
    inviteRole = null;
  }
};

export const clearCallTransport = (owner: unknown): CallRole | null => {
  const entry = Array.from(transports.entries()).find(([, installed]) => installed.owner === owner);
  if (!entry) return null;
  transports.delete(entry[0]);
  return entry[0];
};

export const rememberCallRole = (callId: string, role: CallRole): void => {
  roleByCallId.set(callId, role);
};

export const forgetCallRole = (callId: string): void => {
  roleByCallId.delete(callId);
};

export const selectInviteRole = (role: CallRole): void => {
  inviteRole = role;
};

export const isCallOnRole = (callId: string | null, role: CallRole): boolean =>
  (callId ? roleByCallId.get(callId) : inviteRole) === role;

const resolveTransport = (message: CallSignalingInbound): InstalledTransport | undefined => {
  const role = "callId" in message ? roleByCallId.get(message.callId) : inviteRole;
  if (role) return transports.get(role);
  return transports.size === 1 ? Array.from(transports.values())[0] : transports.get("tutor");
};

export const sendOverTransport = (message: CallSignalingInbound): boolean => {
  const installed = resolveTransport(message);
  if (!installed) {
    console.error("Call transport is not initialized");
    return false;
  }
  installed.send(message);
  return true;
};

export const sendMediaState = (callId: string, media: CallMediaState): void => {
  sendOverTransport({
    type: "call_media_state",
    callId,
    micOn: media.micOn,
    cameraOn: media.cameraOn,
    screenSharing: media.screenSharing,
    cameraAvailable: media.cameraAvailable,
  });
};
