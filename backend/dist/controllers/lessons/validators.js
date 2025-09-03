"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSchedulingConflicts = exports.validateLessonData = void 0;
const validateLessonData = (data) => {
    const { subject, lessonType, startTime, endTime, studentId, price } = data;
    if (!subject || !lessonType || !startTime || !endTime || !studentId) {
        return {
            isValid: false,
            error: "Предмет, тип урока, время начала, время окончания и ID студента обязательны",
        };
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
        return {
            isValid: false,
            error: "Время окончания должно быть позже времени начала",
        };
    }
    if (price && price < 0) {
        return {
            isValid: false,
            error: "Цена должна быть положительной",
        };
    }
    return { isValid: true };
};
exports.validateLessonData = validateLessonData;
const checkSchedulingConflicts = async (userId, startTime, endTime, prisma) => {
    return prisma.lesson.findMany({
        where: {
            tutorId: userId,
            status: {
                not: "CANCELLED",
            },
            OR: [
                {
                    startTime: {
                        lt: endTime,
                    },
                    endTime: {
                        gt: startTime,
                    },
                },
            ],
        },
    });
};
exports.checkSchedulingConflicts = checkSchedulingConflicts;
//# sourceMappingURL=validators.js.map