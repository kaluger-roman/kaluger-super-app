import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const getSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        endpoint: sub.endpoint,
        deviceName: sub.deviceName,
        createdAt: sub.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
