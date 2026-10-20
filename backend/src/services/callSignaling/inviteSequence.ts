import type { CallParticipant } from "./callSignaling.types";

const latestInviteBySender = new Map<string, number>();
let lastTicket = 0;

const senderKey = (sender: CallParticipant): string => `${sender.kind}:${sender.id}`;

// Invites resolve their pair concurrently, so they can finish out of order; only the caller's
// latest invite is the one it still waits for.
export const issueInviteTicket = (sender: CallParticipant): number => {
  lastTicket += 1;
  latestInviteBySender.set(senderKey(sender), lastTicket);
  return lastTicket;
};

export const isLatestInvite = (sender: CallParticipant, ticket: number): boolean =>
  latestInviteBySender.get(senderKey(sender)) === ticket;

export const __resetInviteSequenceForTests = (): void => {
  latestInviteBySender.clear();
};
