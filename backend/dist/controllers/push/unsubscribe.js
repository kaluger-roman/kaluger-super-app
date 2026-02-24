"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsubscribe = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const unsubscribe = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const data = req.body;
        if (!data.endpoint) {
            return res.status(400).json({ error: "Некорректные данные подписки" });
        }
        const subscription = await prisma_1.default.pushSubscription.findFirst({
            where: {
                endpoint: data.endpoint,
                userId: userId,
            },
        });
        if (!subscription) {
            return res.status(404).json({ error: "Подписка не найдена" });
        }
        await prisma_1.default.pushSubscription.delete({
            where: { id: subscription.id },
        });
        res.json({ message: "Подписка удалена" });
    }
    catch (error) {
        console.error("Unsubscribe error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.unsubscribe = unsubscribe;
//# sourceMappingURL=unsubscribe.js.map