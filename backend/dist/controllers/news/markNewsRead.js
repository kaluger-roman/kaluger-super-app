"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNewsRead = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const markNewsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        await prisma_1.default.newsReadStatus.upsert({
            where: { userId },
            update: { lastReadAt: new Date() },
            create: { userId: userId, lastReadAt: new Date() },
        });
        res.json({ message: "Новости отмечены как прочитанные" });
    }
    catch (error) {
        console.error("Mark news read error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.markNewsRead = markNewsRead;
//# sourceMappingURL=markNewsRead.js.map