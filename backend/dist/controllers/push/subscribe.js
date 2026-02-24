"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribe = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const validateSubscriptionData = (data) => {
    if (!data.subscription?.endpoint) {
        return { isValid: false, error: "Некорректные данные подписки" };
    }
    try {
        new URL(data.subscription.endpoint);
    }
    catch {
        return { isValid: false, error: "Некорректные данные подписки" };
    }
    if (!data.subscription?.keys?.p256dh || !data.subscription?.keys?.auth) {
        return { isValid: false, error: "Некорректные данные подписки" };
    }
    if (data.deviceName && data.deviceName.length > 100) {
        return { isValid: false, error: "Название устройства слишком длинное" };
    }
    return { isValid: true };
};
const subscribe = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const data = req.body;
        const validation = validateSubscriptionData(data);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }
        const existing = await prisma_1.default.pushSubscription.findUnique({
            where: { endpoint: data.subscription.endpoint },
        });
        const subscriptionData = {
            endpoint: data.subscription.endpoint,
            p256dh: data.subscription.keys.p256dh,
            auth: data.subscription.keys.auth,
            deviceName: data.deviceName || null,
            userId: userId,
        };
        if (existing) {
            const updated = await prisma_1.default.pushSubscription.update({
                where: { endpoint: data.subscription.endpoint },
                data: subscriptionData,
            });
            return res.status(200).json({
                id: updated.id,
                endpoint: updated.endpoint,
                deviceName: updated.deviceName,
                createdAt: updated.createdAt.toISOString(),
            });
        }
        const subscription = await prisma_1.default.pushSubscription.create({
            data: subscriptionData,
        });
        res.status(201).json({
            id: subscription.id,
            endpoint: subscription.endpoint,
            deviceName: subscription.deviceName,
            createdAt: subscription.createdAt.toISOString(),
        });
    }
    catch (error) {
        console.error("Subscribe error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.subscribe = subscribe;
//# sourceMappingURL=subscribe.js.map