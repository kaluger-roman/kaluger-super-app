import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const markNewsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    await prisma.newsReadStatus.upsert({
      where: { userId },
      update: { lastReadAt: new Date() },
      create: { userId: userId!, lastReadAt: new Date() },
    });

    res.json({ message: "Новости отмечены как прочитанные" });
  } catch (error) {
    console.error("Mark news read error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
