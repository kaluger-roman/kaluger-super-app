import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import type { PushSubscriptionDto } from "../../types";
import { bindPushSubscription } from "../../services";
import { sendBindingResult } from "./subscribe.helpers";
import { validateSubscriptionData } from "./validators";

export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const data: PushSubscriptionDto = req.body;

    const validation = validateSubscriptionData(data);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await bindPushSubscription({ kind: "tutor", id: userId! }, data);
    return sendBindingResult(res, result);
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
