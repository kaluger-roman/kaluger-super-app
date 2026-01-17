"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLessonCancellationInfo = exports.findNextUnpaidLesson = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const findNextUnpaidLesson = async (tutorId, cancelledLesson) => prisma_1.default.lesson.findFirst({
    where: {
        id: { not: cancelledLesson.id },
        tutorId: tutorId,
        studentId: cancelledLesson.studentId,
        status: { in: ["SCHEDULED", "RESCHEDULED"] },
        isPaid: false,
        price: { equals: cancelledLesson.price },
        startTime: { gt: new Date() },
    },
    orderBy: { startTime: "asc" },
    include: { student: { select: { name: true } } },
});
exports.findNextUnpaidLesson = findNextUnpaidLesson;
const getLessonCancellationInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const lesson = await prisma_1.default.lesson.findFirst({
            where: { id, tutorId: userId },
            include: {
                student: { select: { id: true, name: true } },
            },
        });
        if (!lesson) {
            return res.status(404).json({ error: "Урок не найден" });
        }
        if (!lesson.isPaid || !lesson.paymentDate) {
            return res.json({ cancellationInfo: null });
        }
        const nextLesson = await (0, exports.findNextUnpaidLesson)(userId, lesson);
        if (!nextLesson) {
            return res.json({ cancellationInfo: null });
        }
        const cancellationInfo = {
            nextLessonId: nextLesson.id,
            nextLessonStartTime: nextLesson.startTime.toISOString(),
            nextLessonStudentName: nextLesson.student?.name || "",
            transferAmount: lesson.price || 0,
            transferDate: lesson.paymentDate.toISOString(),
        };
        res.json({ cancellationInfo });
    }
    catch (error) {
        console.error("Get cancellation info error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getLessonCancellationInfo = getLessonCancellationInfo;
//# sourceMappingURL=getCancellationInfo.js.map