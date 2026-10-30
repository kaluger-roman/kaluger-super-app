import { timingSafeEqual } from "crypto";
import type { PushSubscription } from "@prisma/client";
import type { PushSubscriptionDto } from "../../types";
import type { PushSubscriptionOwner } from "./pushSubscription.types";

type OwnerFields = Pick<PushSubscription, "userId" | "studentUserId">;

export const toOwnerFields = ({ kind, id }: PushSubscriptionOwner): OwnerFields =>
  kind === "tutor" ? { userId: id, studentUserId: null } : { userId: null, studentUserId: id };

export const toOwnerFilter = ({ kind, id }: PushSubscriptionOwner) =>
  kind === "tutor" ? { userId: id } : { studentUserId: id };

export const isOwnedBy = (stored: OwnerFields, { kind, id }: PushSubscriptionOwner): boolean =>
  (kind === "tutor" ? stored.userId : stored.studentUserId) === id;

const isSameSecret = (stored: string, sent: string): boolean => {
  const storedBytes = Buffer.from(stored);
  const sentBytes = Buffer.from(sent);
  return storedBytes.length === sentBytes.length && timingSafeEqual(storedBytes, sentBytes);
};

// The keys never leave the browser that created the subscription and this table, so a request
// carrying them comes from that browser; the endpoint alone proves nothing.
export const holdsSubscription = (
  stored: Pick<PushSubscription, "p256dh" | "auth">,
  sent: PushSubscriptionDto["subscription"]["keys"]
): boolean => isSameSecret(stored.p256dh, sent.p256dh) && isSameSecret(stored.auth, sent.auth);
