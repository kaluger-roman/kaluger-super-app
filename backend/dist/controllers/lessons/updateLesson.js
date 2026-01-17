"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLesson = void 0;
const wsManager_1 = require("../../lib/wsManager");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const recurringHelpers_1 = require("../../services/recurringHelpers");
const recurringHelpers_2 = require("../../services/recurringHelpers");
const time_1 = require("../../utils/time");
const getCancellationInfo_1 = require("./getCancellationInfo");
const validateUpdateData = async (id, userId, updateData, existingLesson) => {
    if (updateData.startTime || updateData.endTime) {
        if (existingLesson.status === "CANCELLED") {
            return {
                isValid: false,
                error: "Невозможно перенести отменённый урок. Сначала восстановите урок",
                statusCode: 400,
            };
        }
        const start = updateData.startTime
            ? (0, time_1.truncateToMinute)(new Date(updateData.startTime))
            : existingLesson.startTime;
        const end = updateData.endTime
            ? (0, time_1.truncateToMinute)(new Date(updateData.endTime))
            : existingLesson.endTime;
        if (start >= end) {
            return {
                isValid: false,
                error: "Время окончания должно быть позже времени начала",
            };
        }
        const conflictingLesson = await prisma_1.default.lesson.findFirst({
            where: {
                id: { not: id },
                tutorId: userId,
                status: { not: "CANCELLED" },
                OR: [
                    {
                        startTime: { lt: end },
                        endTime: { gt: start },
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
        return { isValid: false, error: "Цена должна быть положительной" };
    }
    if (updateData.grade && (updateData.grade < 1 || updateData.grade > 5)) {
        return { isValid: false, error: "Оценка должна быть от 1 до 5" };
    }
    return { isValid: true };
};
const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const updateData = req.body;
        const existingLesson = await prisma_1.default.lesson.findFirst({
            where: {
                id,
                tutorId: userId,
            },
        });
        if (!existingLesson) {
            return res.status(404).json({ error: "Урок не найден" });
        }
        const validation = await validateUpdateData(id, userId, updateData, existingLesson);
        if (!validation.isValid) {
            const statusCode = validation.statusCode || 400;
            return res.status(statusCode).json({ error: validation.error });
        }
        const now = (0, time_1.truncateToMinute)(new Date());
        const start = updateData.startTime
            ? (0, time_1.truncateToMinute)(new Date(updateData.startTime))
            : (0, time_1.truncateToMinute)(new Date(existingLesson.startTime));
        const end = updateData.endTime
            ? (0, time_1.truncateToMinute)(new Date(updateData.endTime))
            : (0, time_1.truncateToMinute)(new Date(existingLesson.endTime));
        let computedStatus = undefined;
        if (end.getTime() <= now.getTime() && updateData.status !== "CANCELLED") {
            computedStatus = "COMPLETED";
        }
        else if (start.getTime() <= now.getTime() &&
            end.getTime() > now.getTime() &&
            updateData.status !== "CANCELLED") {
            computedStatus = "IN_PROGRESS";
        }
        else {
            if (!updateData.status) {
                computedStatus =
                    existingLesson.status === "CANCELLED" ? "CANCELLED" : undefined;
            }
        }
        const dataToUpdate = {
            ...updateData,
            ...(updateData.startTime ? { startTime: start } : {}),
            ...(updateData.endTime ? { endTime: end } : {}),
            ...(computedStatus ? { status: computedStatus } : {}),
        };
        if (updateData.status === "CANCELLED" &&
            existingLesson.isPaid &&
            existingLesson.paymentDate) {
            const nextLesson = await (0, getCancellationInfo_1.findNextUnpaidLesson)(userId, existingLesson);
            if (nextLesson) {
                await prisma_1.default.lesson.update({
                    where: { id: nextLesson.id },
                    data: { isPaid: true, paymentDate: existingLesson.paymentDate },
                });
            }
            dataToUpdate.isPaid = false;
            delete dataToUpdate.paymentDate;
        }
        const lesson = await prisma_1.default.lesson.update({
            where: { id },
            data: dataToUpdate,
            include: { student: { select: { id: true, name: true } } },
        });
        if (existingLesson.isRecurring &&
            (updateData.startTime || updateData.endTime) &&
            existingLesson.status === "SCHEDULED" &&
            updateData.status !== "RESCHEDULED") {
            const newStart = (0, time_1.truncateToMinute)(new Date(start));
            const newEnd = (0, time_1.truncateToMinute)(new Date(end));
            const result = await (0, recurringHelpers_1.shiftFutureRecurringLessons)(existingLesson, newStart, newEnd);
            if (result.conflicts && result.conflicts.length > 0) {
                throw new Error("Перенесенная серия конфликтует с другими уроками");
            }
            else if (result.shifted && result.shifted > 0) {
                console.log(`Shifted ${result.shifted} future recurring lessons`);
            }
        }
        if (existingLesson.isRecurring &&
            Object.prototype.hasOwnProperty.call(updateData, "price") &&
            existingLesson.status === "SCHEDULED" &&
            updateData.status !== "RESCHEDULED") {
            const newPrice = updateData.price ?? null;
            await (0, recurringHelpers_2.updatePriceForFutureRecurringLessons)(existingLesson, newPrice);
        }
        res.json({
            message: "Урок успешно обновлен",
            lesson,
        });
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