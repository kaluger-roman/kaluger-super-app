import type { CallLessonSummary } from "@entities";
import { isRecord, isSubject } from "@shared";

import type { PeerPresence, PeerPresenceState } from "../videoCall.types";
import { CALL_SNAPSHOT_STATUSES, PEER_PRESENCES } from "./signaling.constants";
import type { CallSnapshot, CallSnapshotStatus, IceServerPayload } from "./signaling.types";

export const isString = (value: unknown): value is string => typeof value === "string";

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || isString(value);

const isPeerPresence = (value: unknown): value is PeerPresence =>
  PEER_PRESENCES.some((presence) => presence === value);

const isSnapshotStatus = (value: unknown): value is CallSnapshotStatus =>
  CALL_SNAPSHOT_STATUSES.some((status) => status === value);

// A malformed lesson only hides the lesson block: the call itself must still ring.
export const toCallLesson = (value: unknown): CallLessonSummary | null => {
  if (!isRecord(value)) return null;
  const { id, subject, startTime, endTime } = value;
  if (!isString(id) || !isString(startTime) || !isString(endTime) || !isSubject(subject)) {
    return null;
  }
  return { id, subject, startTime, endTime };
};

export const toIceServers = (value: unknown): IceServerPayload[] | null => {
  if (!Array.isArray(value)) return null;
  const servers: IceServerPayload[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const { urls, username, credential } = item;
    if (!isString(urls) || !isOptionalString(username) || !isOptionalString(credential)) {
      return null;
    }
    servers.push({ urls, username, credential });
  }
  return servers;
};

export const toPeerPresenceState = (data: Record<string, unknown>): PeerPresenceState | null => {
  const { presence, audioSuspended, videoSuspended } = data;
  if (!isPeerPresence(presence)) return null;
  if (typeof audioSuspended !== "boolean" || typeof videoSuspended !== "boolean") return null;
  return { presence, audioSuspended, videoSuspended };
};

// A snapshot drives a restore (screens, media, timer), so a malformed one is dropped as a whole.
export const toCallSnapshot = (value: unknown): CallSnapshot | null => {
  if (!isRecord(value)) return null;
  const { callId, status, direction, peerName, connectedAt } = value;
  if (!isString(callId) || callId.length === 0 || !isSnapshotStatus(status)) return null;
  if (direction !== "incoming" && direction !== "outgoing") return null;
  if (!isString(peerName) || !(connectedAt === null || isString(connectedAt))) return null;
  const iceServers = toIceServers(value.iceServers);
  const peerPresence = isRecord(value.peerPresence)
    ? toPeerPresenceState(value.peerPresence)
    : null;
  if (!iceServers || !peerPresence) return null;
  return {
    callId,
    status,
    direction,
    peerName,
    lesson: toCallLesson(value.lesson),
    iceServers,
    peerPresence,
    connectedAt,
  };
};
