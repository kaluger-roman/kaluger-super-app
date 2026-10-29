import { prisma } from "../../lib/prisma";
import type { PushSubscriptionDto } from "../../types";
import { MAX_PUSH_SUBSCRIPTIONS_PER_OWNER } from "./pushSubscription.constants";
import {
  holdsSubscription,
  isOwnedBy,
  toOwnerFields,
  toOwnerFilter,
} from "./pushSubscription.helpers";
import type { BindPushSubscriptionResult, PushSubscriptionOwner } from "./pushSubscription.types";

const dropSurplusSubscriptions = async (
  owner: PushSubscriptionOwner,
  keptId: string
): Promise<void> => {
  const surplus = await prisma.pushSubscription.findMany({
    where: { ...toOwnerFilter(owner), id: { not: keptId } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: MAX_PUSH_SUBSCRIPTIONS_PER_OWNER - 1,
    select: { id: true },
  });
  if (surplus.length === 0) return;
  await prisma.pushSubscription.deleteMany({ where: { id: { in: surplus.map(({ id }) => id) } } });
};

// The browser's holder takes over a subscription left by another account (contracts/push-api.md).
// Beyond MAX_PUSH_SUBSCRIPTIONS_PER_OWNER the owner's devices registered longest ago are dropped.
export const bindPushSubscription = async (
  owner: PushSubscriptionOwner,
  { subscription, deviceName }: PushSubscriptionDto
): Promise<BindPushSubscriptionResult> => {
  const { endpoint, keys } = subscription;
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (existing && !isOwnedBy(existing, owner) && !holdsSubscription(existing, keys)) {
    return { outcome: "forbidden" };
  }

  const data = {
    channel: "WEB_PUSH" as const,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    deviceName: deviceName || null,
    ...toOwnerFields(owner),
  };
  // Upsert is race-safe: parallel registrations of the same endpoint (which is `@unique`) used to
  // crash on P2002 with `findUnique + create`. A repeated registration moves the device to the
  // newest, so the cap drops devices that stopped registering, not the first ones added.
  const bound = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { ...data, createdAt: new Date() },
    create: data,
  });
  await dropSurplusSubscriptions(owner, bound.id);

  return { outcome: existing ? "updated" : "created", subscription: bound };
};
