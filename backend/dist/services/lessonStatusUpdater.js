"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLessonStatusesForUser = exports.updateLessonStatuses = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const updateLessonStatuses = async () => {
    const now = new Date();
    try {
        // Update lessons to IN_PROGRESS if they have started
        const startedLessons = await prisma_1.default.lesson.updateMany({
            where: {
                status: "SCHEDULED",
                startTime: {
                    lte: now,
                },
                endTime: {
                    gt: now,
                },
            },
            data: {
                status: "IN_PROGRESS",
            },
        });
        // Update lessons to COMPLETED if they have ended
        const completedLessons = await prisma_1.default.lesson.updateMany({
            where: {
                status: { in: ["IN_PROGRESS", "SCHEDULED", "RESCHEDULED"] },
                endTime: {
                    lte: now,
                },
            },
            data: {
                status: "COMPLETED",
            },
        });
        console.log(`Updated ${startedLessons.count} lessons to IN_PROGRESS`);
        console.log(`Updated ${completedLessons.count} lessons to COMPLETED`);
        return {
            startedLessons: startedLessons.count,
            completedLessons: completedLessons.count,
        };
    }
    catch (error) {
        console.error("Error updating lesson statuses:", error);
        throw error;
    }
};
exports.updateLessonStatuses = updateLessonStatuses;
const updateLessonStatusesForUser = async (userId) => {
    const now = new Date();
    try {
        // Update lessons to IN_PROGRESS if they have started
        const startedLessons = await prisma_1.default.lesson.updateMany({
            where: {
                tutorId: userId,
                status: "SCHEDULED",
                startTime: {
                    lte: now,
                },
                endTime: {
                    gt: now,
                },
            },
            data: {
                status: "IN_PROGRESS",
            },
        });
        // Update lessons to COMPLETED if they have ended
        const completedLessons = await prisma_1.default.lesson.updateMany({
            where: {
                tutorId: userId,
                status: "IN_PROGRESS",
                endTime: {
                    lte: now,
                },
            },
            data: {
                status: "COMPLETED",
            },
        });
        return {
            startedLessons: startedLessons.count,
            completedLessons: completedLessons.count,
        };
    }
    catch (error) {
        console.error("Error updating lesson statuses for user:", error);
        throw error;
    }
};
exports.updateLessonStatusesForUser = updateLessonStatusesForUser;
//# sourceMappingURL=lessonStatusUpdater.js.map