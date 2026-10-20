import type { CallParticipant } from "./callSignaling.types";
import { INVITE_RATE_LIMIT, INVITE_RATE_WINDOW_MS } from "./callSignaling.constants";

const invitesBySender = new Map<string, number[]>();

export const registerInviteAttempt = (sender: CallParticipant, now = Date.now()): boolean => {
  const key = `${sender.kind}:${sender.id}`;
  const recent = (invitesBySender.get(key) ?? []).filter(
    (timestamp) => now - timestamp < INVITE_RATE_WINDOW_MS
  );
  if (recent.length >= INVITE_RATE_LIMIT) {
    invitesBySender.set(key, recent);
    return false;
  }
  recent.push(now);
  invitesBySender.set(key, recent);
  return true;
};

export const __resetInviteRateLimitForTests = (): void => {
  invitesBySender.clear();
};
