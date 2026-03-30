import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import type { PushUnsubscribeDto } from "../../types";
import prisma from "../../lib/prisma";

export const unsubscribe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const data: PushUnsubscribeDto = req.body;

    if (!data.endpoint) {
      return res.status(400).json({ error: "Некорректные данные подписки" });
    }

    const subscription = await prisma.pushSubscription.findFirst({
      where: {
        endpoint: data.endpoint,
        userId: userId!,
      },
    });

    if (!subscription) {
      return res.status(404).json({ error: "Подписка не найдена" });
    }

    await prisma.pushSubscription.delete({
      where: { id: subscription.id },
    });

    res.json({ message: "Подписка удалена" });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
