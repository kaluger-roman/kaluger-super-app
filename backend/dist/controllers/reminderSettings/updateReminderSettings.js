"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReminderSettings = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const reminderScheduler_1 = require("../../services/reminderScheduler");
const VALID_INTERVALS = [5, 10, 15, 30, 60];
const validateSettingsData = (data) => {
    if (data.intervals !== undefined) {
        if (!Array.isArray(data.intervals)) {
            return { isValid: false, error: "Интервалы должны быть массивом" };
        }
        for (const interval of data.intervals) {
            if (!VALID_INTERVALS.includes(interval)) {
                return {
                    isValid: false,
                    error: "Недопустимый интервал напоминания. Допустимые значения: 5, 10, 15, 30, 60 минут",
                };
            }
        }
        const uniqueIntervals = new Set(data.intervals);
        if (uniqueIntervals.size !== data.intervals.length) {
            return { isValid: false, error: "Такой интервал уже добавлен" };
        }
    }
    return { isValid: true };
};
const updateReminderSettings = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const data = req.body;
        const validation = validateSettingsData(data);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }
        // Get or create existing settings
        let existing = await prisma_1.default.reminderSettings.findUnique({
            where: { userId: userId },
        });
        if (!existing) {
            existing = await prisma_1.default.reminderSettings.create({
                data: {
                    userId: userId,
                    enabled: false,
                    intervals: [],
                    muteWhenInLesson: false,
                },
            });
        }
        // Build update data
        const updateData = {};
        if (data.enabled !== undefined) {
            updateData.enabled = data.enabled;
        }
        if (data.intervals !== undefined) {
            updateData.intervals = data.intervals;
        }
        if (data.muteWhenInLesson !== undefined) {
            updateData.muteWhenInLesson = data.muteWhenInLesson;
        }
        // Auto-set intervals to [30] if enabling with empty intervals
        const willBeEnabled = updateData.enabled ?? existing.enabled;
        const willHaveIntervals = updateData.intervals ?? existing.intervals;
        if (willBeEnabled && willHaveIntervals.length === 0) {
            updateData.intervals = [30];
        }
        const settings = await prisma_1.default.reminderSettings.update({
            where: { userId: userId },
            data: updateData,
        });
        // Recalculate reminders when enabled or intervals change
        const enabledChanged = data.enabled !== undefined && data.enabled !== existing.enabled;
        const intervalsChanged = data.intervals !== undefined &&
            JSON.stringify(data.intervals.sort()) !== JSON.stringify(existing.intervals.sort());
        if (enabledChanged && !settings.enabled) {
            // Disabled — cancel all pending reminders
            await (0, reminderScheduler_1.cancelAllPendingReminders)(userId);
        }
        else if (enabledChanged || intervalsChanged) {
            // Enabled or intervals changed — recalculate
            if (settings.enabled) {
                await (0, reminderScheduler_1.recalculateRemindersForUser)(userId);
            }
        }
        res.json({
            enabled: settings.enabled,
            intervals: settings.intervals,
            muteWhenInLesson: settings.muteWhenInLesson,
        });
    }
    catch (error) {
        console.error("Update reminder settings error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.updateReminderSettings = updateReminderSettings;
//# sourceMappingURL=updateReminderSettings.js.map