"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasUnreadNews = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const hasUnreadNews = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const latestNews = await prisma_1.default.newsItem.findFirst({
            orderBy: { publishedAt: "desc" },
            select: { publishedAt: true },
        });
        if (!latestNews) {
            return res.json({ hasUnread: false });
        }
        const readStatus = await prisma_1.default.newsReadStatus.findUnique({
            where: { userId },
        });
        const hasUnread = !readStatus || readStatus.lastReadAt < latestNews.publishedAt;
        res.json({ hasUnread });
    }
    catch (error) {
        console.error("Has unread news error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.hasUnreadNews = hasUnreadNews;
//# sourceMappingURL=hasUnreadNews.js.map