"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReminderSettings = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const getReminderSettings = async (req, res) => {
    try {
        const userId = req.user?.userId;
        let settings = await prisma_1.default.reminderSettings.findUnique({
            where: { userId: userId },
        });
        // Lazy creation — create default settings if none exist
        if (!settings) {
            settings = await prisma_1.default.reminderSettings.create({
                data: {
                    userId: userId,
                    enabled: false,
                    intervals: [],
                    muteWhenInLesson: false,
                },
            });
        }
        res.json({
            enabled: settings.enabled,
            intervals: settings.intervals,
            muteWhenInLesson: settings.muteWhenInLesson,
        });
    }
    catch (error) {
        console.error("Get reminder settings error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getReminderSettings = getReminderSettings;
//# sourceMappingURL=getReminderSettings.js.map