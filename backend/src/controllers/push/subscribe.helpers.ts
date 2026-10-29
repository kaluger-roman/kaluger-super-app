import type { Response } from "express";
import type { BindPushSubscriptionResult } from "../../services";
import type { PushSubscriptionResponse } from "../../types";

export const sendBindingResult = (res: Response, result: BindPushSubscriptionResult) => {
  if (result.outcome === "forbidden") {
    return res.status(403).json({ error: "Подписка принадлежит другому пользователю" });
  }
  const { subscription } = result;
  const body: PushSubscriptionResponse = {
    id: subscription.id,
    endpoint: subscription.endpoint,
    deviceName: subscription.deviceName,
    createdAt: subscription.createdAt.toISOString(),
  };
  return res.status(result.outcome === "created" ? 201 : 200).json(body);
};
