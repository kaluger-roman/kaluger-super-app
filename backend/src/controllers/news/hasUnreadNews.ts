import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const hasUnreadNews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const latestNews = await prisma.newsItem.findFirst({
      orderBy: { publishedAt: "desc" },
      select: { publishedAt: true },
    });

    if (!latestNews) {
      return res.json({ hasUnread: false });
    }

    const readStatus = await prisma.newsReadStatus.findUnique({
      where: { userId },
    });

    const hasUnread = !readStatus || readStatus.lastReadAt < latestNews.publishedAt;

    res.json({ hasUnread });
  } catch (error) {
    console.error("Has unread news error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
