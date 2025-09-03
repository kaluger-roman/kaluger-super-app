"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLesson = void 0;
const wsManager_1 = require("../../lib/wsManager");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const validateUpdateData = async (id, userId, updateData, existingLesson) => {
    // Validation for time updates
    if (updateData.startTime || updateData.endTime) {
        const start = updateData.startTime
            ? new Date(updateData.startTime)
            : existingLesson.startTime;
        const end = updateData.endTime
            ? new Date(updateData.endTime)
            : existingLesson.endTime;
        if (start >= end) {
            return {
                isValid: false,
                error: "Время окончания должно быть позже времени начала",
            };
        }
        // Check for scheduling conflicts (excluding current lesson)
        const conflictingLesson = await prisma_1.default.lesson.findFirst({
            where: {
                id: { not: id },
                tutorId: userId,
                status: { not: "CANCELLED" },
                OR: [
                    {
                        startTime: {
                            lt: end,
                        },
                        endTime: {
                            gt: start,
                        },
                    },
                ],
            },
        });
        if (conflictingLesson) {
            return {
                isValid: false,
                error: "Временной слот конфликтует с существующим уроком",
                statusCode: 409,
            };
        }
    }
    if (updateData.price && updateData.price < 0) {
        return {
            isValid: false,
            error: "Цена должна быть положительной",
        };
    }
    if (updateData.grade && (updateData.grade < 1 || updateData.grade > 5)) {
        return {
            isValid: false,
            error: "Оценка должна быть от 1 до 5",
        };
    }
    return { isValid: true };
};
const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const updateData = req.body;
        // Check if lesson exists and belongs to user
        const existingLesson = await prisma_1.default.lesson.findFirst({
            where: {
                id,
                tutorId: userId,
            },
        });
        if (!existingLesson) {
            return res.status(404).json({ error: "Урок не найден" });
        }
        // Validate update data
        const validation = await validateUpdateData(id, userId, updateData, existingLesson);
        if (!validation.isValid) {
            const statusCode = validation.statusCode || 400;
            return res.status(statusCode).json({ error: validation.error });
        }
        // If times are changed (or status is not explicitly provided), compute status based on new times
        const now = new Date();
        const start = updateData.startTime
            ? new Date(updateData.startTime)
            : existingLesson.startTime;
        const end = updateData.endTime
            ? new Date(updateData.endTime)
            : existingLesson.endTime;
        let computedStatus = undefined;
        if (end.getTime() <= now.getTime()) {
            computedStatus = "COMPLETED";
        }
        else if (start.getTime() <= now.getTime() &&
            end.getTime() > now.getTime()) {
            computedStatus = "IN_PROGRESS";
        }
        else {
            // If status explicitly provided in updateData, respect it; otherwise keep existing status or SCHEDULED
            if (!updateData.status) {
                computedStatus =
                    existingLesson.status === "CANCELLED" ? "CANCELLED" : undefined;
            }
        }
        const dataToUpdate = {
            ...updateData,
            ...(computedStatus ? { status: computedStatus } : {}),
        };
        const lesson = await prisma_1.default.lesson.update({
            where: { id },
            data: dataToUpdate,
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        res.json({
            message: "Урок успешно обновлен",
            lesson,
        });
        // Отправляем WebSocket уведомление о статусе урока только если статус изменился
        if (updateData.status && updateData.status !== existingLesson.status) {
            const wsManager = (0, wsManager_1.getWebSocketManager)();
            if (wsManager) {
                wsManager.broadcastLessonStatusUpdate(lesson.id, lesson.status, userId);
            }
        }
    }
    catch (error) {
        console.error("Update lesson error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.updateLesson = updateLesson;
//# sourceMappingURL=updateLesson.js.map