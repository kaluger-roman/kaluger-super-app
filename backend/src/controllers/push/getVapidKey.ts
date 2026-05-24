import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";

export const getVapidKey = async (_req: AuthRequest, res: Response) => {
  try {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? null;

    res.json({ vapidPublicKey, configured: Boolean(vapidPublicKey) });
  } catch (error) {
    console.error("Get VAPID key error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
