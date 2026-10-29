import type { Response } from "express";
import type { PushSubscriptionDto, StudentRequest } from "../../types";
import { bindPushSubscription } from "../../services";
import { sendBindingResult, validateSubscriptionData } from "../push";

export const studentPushSubscribe = async (req: StudentRequest, res: Response) => {
  try {
    const studentUserId = req.studentUser?.studentUserId;
    if (!studentUserId) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const data: PushSubscriptionDto = req.body;
    const validation = validateSubscriptionData(data);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await bindPushSubscription({ kind: "student", id: studentUserId }, data);
    return sendBindingResult(res, result);
  } catch (error) {
    console.error("Student push subscribe error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
