"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNews = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const getNews = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const [news, total] = await Promise.all([
            prisma_1.default.newsItem.findMany({
                orderBy: { publishedAt: "desc" },
                skip,
                take: limit,
            }),
            prisma_1.default.newsItem.count(),
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
    }
    catch (error) {
        console.error("Get news error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getNews = getNews;
//# sourceMappingURL=getNews.js.map