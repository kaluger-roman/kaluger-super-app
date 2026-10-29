import type { PushSubscription } from "@prisma/client";
import type { CallerKindValue } from "../../types";

export type PushSubscriptionOwner = {
  kind: CallerKindValue;
  id: string;
};

export type BindPushSubscriptionResult =
  { outcome: "created" | "updated"; subscription: PushSubscription } | { outcome: "forbidden" };
