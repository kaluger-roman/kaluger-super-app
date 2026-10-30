import type {
  CallPeer,
  CallPhase,
  IncomingCall,
  LocalMediaParams,
  ResumeRequest,
} from "./call.types";
import type { CallRole } from "./signaling.types";

const peerRoleOf = (role: CallRole): CallRole => (role === "tutor" ? "student" : "tutor");

export const secondsSince = (iso: string | null, now: number): number => {
  if (!iso) return 0;
  const started = Date.parse(iso);
  return Number.isNaN(started) ? 0 : Math.max(0, Math.floor((now - started) / 1000));
};

export const toRestoredIncoming = ({ role, snapshot }: ResumeRequest): IncomingCall | null =>
  snapshot.direction === "incoming"
    ? { callId: snapshot.callId, callerName: snapshot.peerName, role, lesson: snapshot.lesson }
    : null;

export const toRestoredOutgoingPeer = ({ role, snapshot }: ResumeRequest): CallPeer | null =>
  snapshot.direction === "outgoing" ? { name: snapshot.peerName, role: peerRoleOf(role) } : null;

// A call that once connected comes back as active: a connection that fails then is recovered,
// not treated as one that could never be set up.
export const toRestoredPhase = ({ snapshot }: ResumeRequest): CallPhase => {
  if (snapshot.status === "ringing") return snapshot.direction;
  return snapshot.status === "connected" ? "active" : "connecting";
};

export const toRestoredMedia = ({ role, snapshot }: ResumeRequest): LocalMediaParams => ({
  callId: snapshot.callId,
  role,
  iceServers: snapshot.iceServers,
  polite: snapshot.direction === "incoming",
});
