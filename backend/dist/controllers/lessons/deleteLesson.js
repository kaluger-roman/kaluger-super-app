"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLesson = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteAllFuture } = req.body;
        const userId = req.user?.userId;
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
        if (deleteAllFuture && existingLesson.isRecurring) {
            // Delete all future recurring lessons with the same pattern
            await prisma_1.default.lesson.deleteMany({
                where: {
                    tutorId: userId,
                    studentId: existingLesson.studentId,
                    subject: existingLesson.subject,
                    lessonType: existingLesson.lessonType,
                    isRecurring: true,
                    status: { notIn: ["CANCELLED", "COMPLETED"] },
                },
            });
            res.json({
                message: "Все будущие регулярные уроки успешно удалены",
            });
        }
        else {
            await prisma_1.default.lesson.delete({
                where: { id },
            });
            res.json({ message: "Урок успешно удален" });
        }
    }
    catch (error) {
        console.error("Delete lesson error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.deleteLesson = deleteLesson;
//# sourceMappingURL=deleteLesson.js.map