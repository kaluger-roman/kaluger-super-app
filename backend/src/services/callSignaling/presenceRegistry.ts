import type { CallerKindValue } from "../../types";
import { DEFAULT_PRESENCE } from "./callSignaling.constants";
import type { CallParticipant, ParticipantPresence } from "./callSignaling.types";

const presences = new Map<string, ParticipantPresence>();

const keyOf = (kind: CallerKindValue, id: string): string => `${kind}:${id}`;

export const getPresence = (participant: CallParticipant): ParticipantPresence =>
  presences.get(keyOf(participant.kind, participant.id)) ?? DEFAULT_PRESENCE;

export const setPresence = (participant: CallParticipant, presence: ParticipantPresence): void => {
  presences.set(keyOf(participant.kind, participant.id), presence);
};

export const clearPresence = (participant: CallParticipant): void => {
  presences.delete(keyOf(participant.kind, participant.id));
};

export const __resetPresenceForTests = (): void => {
  presences.clear();
};
