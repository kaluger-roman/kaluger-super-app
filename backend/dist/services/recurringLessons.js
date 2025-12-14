"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRecurringLessons = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const recurringHelpers_1 = require("./recurringHelpers");
const time_1 = require("../utils/time");
const processRecurringLessons = async () => {
    try {
        console.log("Processing recurring lessons...");
        // Найти все регулярные уроки
        const recurringLessons = await prisma_1.default.lesson.findMany({
            where: {
                isRecurring: true,
                // status: "SCHEDULED",
                startTime: {
                    gte: (0, time_1.truncateToMinute)(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
                },
            },
            include: {
                student: true,
            },
        });
        if (recurringLessons.length === 0) {
            console.log("No recurring lessons found");
            return;
        }
        // Группируем уроки по уникальным комбинациям (tutor + student + time pattern)
        const lessonGroups = (0, recurringHelpers_1.groupRecurringLessonsByPattern)(recurringLessons);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        let createdCount = 0;
        for (const [_, lastLesson] of lessonGroups) {
            // Создаем уроки от последнего существующего до 3 месяцев вперед
            let currentStart = (0, time_1.truncateToMinute)(new Date(lastLesson.startTime.getTime() + 7 * 24 * 60 * 60 * 1000));
            let currentEnd = (0, time_1.truncateToMinute)(new Date(lastLesson.endTime.getTime() + 7 * 24 * 60 * 60 * 1000));
            const lessonsToCreate = [];
            while (currentStart <= threeMonthsFromNow) {
                // Проверяем конфликты
                const conflicts = await prisma_1.default.lesson.findMany({
                    where: {
                        tutorId: lastLesson.tutorId,
                        status: {
                            not: "CANCELLED",
                        },
                        OR: [
                            {
                                startTime: {
                                    lt: currentEnd,
                                },
                                endTime: {
                                    gt: currentStart,
                                },
                            },
                        ],
                    },
                });
                if (conflicts.length === 0) {
                    lessonsToCreate.push({
                        subject: lastLesson.subject,
                        lessonType: lastLesson.lessonType,
                        startTime: currentStart,
                        endTime: currentEnd,
                        price: lastLesson.price,
                        isRecurring: true,
                        tutorId: lastLesson.tutorId,
                        studentId: lastLesson.studentId,
                    });
                }
                // Переходим к следующей неделе
                currentStart = (0, time_1.truncateToMinute)(new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000));
                currentEnd = (0, time_1.truncateToMinute)(new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000));
            }
            if (lessonsToCreate.length > 0) {
                await prisma_1.default.lesson.createMany({
                    data: lessonsToCreate,
                });
                createdCount += lessonsToCreate.length;
            }
        }
        console.log(`Created ${createdCount} new recurring lessons`);
        return createdCount;
    }
    catch (error) {
        console.error("Error processing recurring lessons:", error);
        throw error;
    }
};
exports.processRecurringLessons = processRecurringLessons;
//# sourceMappingURL=recurringLessons.js.map