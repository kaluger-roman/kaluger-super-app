"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptions = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const getSubscriptions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const subscriptions = await prisma_1.default.pushSubscription.findMany({
            where: { userId: userId },
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
    }
    catch (error) {
        console.error("Get subscriptions error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getSubscriptions = getSubscriptions;
//# sourceMappingURL=getSubscriptions.js.map