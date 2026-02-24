"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVapidKey = void 0;
const getVapidKey = async (_req, res) => {
    try {
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            return res.status(500).json({ error: "VAPID ключ не настроен на сервере" });
        }
        res.json({ vapidPublicKey });
    }
    catch (error) {
        console.error("Get VAPID key error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getVapidKey = getVapidKey;
//# sourceMappingURL=getVapidKey.js.map