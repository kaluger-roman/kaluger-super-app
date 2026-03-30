import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";

export const getVapidKey = async (_req: AuthRequest, res: Response) => {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      return res.status(500).json({ error: "VAPID ключ не настроен на сервере" });
    }

    res.json({ vapidPublicKey });
  } catch (error) {
    console.error("Get VAPID key error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
