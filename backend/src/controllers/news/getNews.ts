import type { Response } from "express";
import type { AuthRequest } from "../../middleware/auth";
import prisma from "../../lib/prisma";

export const getNews = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
      prisma.newsItem.findMany({
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.newsItem.count(),
    ]);

    res.json({
      news: news.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        version: item.version,
        publishedAt: item.publishedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get news error:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
};
