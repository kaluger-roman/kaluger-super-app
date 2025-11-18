"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLessonStatuses = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const wsManager_1 = require("../lib/wsManager");
const time_1 = require("../utils/time");
const updateLessonStatuses = async () => {
    const now = (0, time_1.truncateToMinute)(new Date());
    const wsManager = (0, wsManager_1.getWebSocketManager)();
    try {
        // Получаем уроки, которые должны стать IN_PROGRESS
        const lessonsToStart = await prisma_1.default.lesson.findMany({
            where: {
                status: { in: ["SCHEDULED", "RESCHEDULED"] },
                startTime: {
                    lte: now,
                },
                endTime: {
                    gt: now,
                },
            },
        });
        // Получаем уроки, которые должны стать COMPLETED
        const lessonsToComplete = await prisma_1.default.lesson.findMany({
            where: {
                status: { in: ["IN_PROGRESS", "SCHEDULED", "RESCHEDULED"] },
                endTime: {
                    lte: now,
                },
            },
        });
        // Обновляем статусы и отправляем WebSocket уведомления
        for (const lesson of lessonsToStart) {
            await prisma_1.default.lesson.update({
                where: { id: lesson.id },
                data: { status: "IN_PROGRESS" },
            });
            if (wsManager) {
                wsManager.broadcastLessonStatusUpdate(lesson.id, "IN_PROGRESS", lesson.tutorId);
            }
        }
        for (const lesson of lessonsToComplete) {
            await prisma_1.default.lesson.update({
                where: { id: lesson.id },
                data: { status: "COMPLETED" },
            });
            if (wsManager) {
                wsManager.broadcastLessonStatusUpdate(lesson.id, "COMPLETED", lesson.tutorId);
            }
        }
        console.log(`Updated ${lessonsToStart.length} lessons to IN_PROGRESS`);
        console.log(`Updated ${lessonsToComplete.length} lessons to COMPLETED`);
        return {
            startedLessons: lessonsToStart.length,
            completedLessons: lessonsToComplete.length,
        };
    }
    catch (error) {
        console.error("Error updating lesson statuses:", error);
        throw error;
    }
};
exports.updateLessonStatuses = updateLessonStatuses;
//# sourceMappingURL=lessonStatusUpdater.js.map