"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLesson = void 0;
const wsManager_1 = require("../../lib/wsManager");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const validators_1 = require("./validators");
const createSingleLesson = async (userId, data, student, res) => {
    const { subject, lessonType, description, startTime, endTime, price, homework, notes, studentId, } = data;
    const start = new Date(startTime);
    const end = new Date(endTime);
    // Check for scheduling conflicts for single lesson
    const conflicts = await (0, validators_1.checkSchedulingConflicts)(userId, start, end, prisma_1.default);
    if (conflicts.length > 0) {
        return res.status(400).json({
            error: "Временной слот конфликтует с существующим уроком",
        });
    }
    const lesson = await prisma_1.default.lesson.create({
        data: {
            subject,
            lessonType,
            description,
            startTime: start,
            endTime: end,
            price: price || student.hourlyRate,
            homework,
            notes,
            isRecurring: false,
            tutorId: userId,
            studentId,
        },
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
    res.status(201).json({ lesson });
    // Отправляем WebSocket уведомление о статусе урока
    const wsManager = (0, wsManager_1.getWebSocketManager)();
    if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(lesson.id, lesson.status, userId);
    }
};
const createRecurringLessons = async (userId, data, student, res) => {
    const { subject, lessonType, description, startTime, endTime, price, homework, notes, studentId, } = data;
    const start = new Date(startTime);
    const end = new Date(endTime);
    // Создаем регулярные уроки на 3 месяца вперед
    const lessons = [];
    const threeMonthsLater = new Date(start);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    let currentStart = new Date(start);
    let currentEnd = new Date(end);
    while (currentStart <= threeMonthsLater) {
        // Check for scheduling conflicts
        const conflicts = await (0, validators_1.checkSchedulingConflicts)(userId, currentStart, currentEnd, prisma_1.default);
        if (conflicts.length === 0) {
            const lessonData = {
                subject,
                lessonType,
                description: currentStart.getTime() === start.getTime() ? description : undefined,
                startTime: currentStart,
                endTime: currentEnd,
                price: price || student.hourlyRate,
                homework: currentStart.getTime() === start.getTime() ? homework : undefined,
                notes: currentStart.getTime() === start.getTime() ? notes : undefined,
                isRecurring: true,
                tutorId: userId,
                studentId,
            };
            lessons.push(lessonData);
        }
        // Move to next week
        currentStart = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        currentEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    if (lessons.length === 0) {
        return res.status(400).json({
            error: "Невозможно создать регулярные уроки из-за конфликтов в расписании",
        });
    }
    // Create all lessons
    const createdLessons = await prisma_1.default.lesson.createMany({
        data: lessons,
    });
    // Get the first lesson to return
    const firstLesson = await prisma_1.default.lesson.findFirst({
        where: {
            tutorId: userId,
            startTime: start,
            studentId,
        },
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
    res.status(201).json({
        lesson: firstLesson,
        message: `Создано ${createdLessons.count} регулярных уроков`,
    });
    // Отправляем WebSocket уведомление о статусе урока
    const wsManager = (0, wsManager_1.getWebSocketManager)();
    if (wsManager && firstLesson) {
        wsManager.broadcastLessonStatusUpdate(firstLesson.id, firstLesson.status, userId);
    }
};
const createLesson = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const data = req.body;
        // Validation
        const validation = (0, validators_1.validateLessonData)(data);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }
        // Check if student belongs to user
        const student = await prisma_1.default.student.findFirst({
            where: {
                id: data.studentId,
                tutorId: userId,
            },
        });
        if (!student) {
            return res.status(404).json({ error: "Ученик не найден" });
        }
        if (data.isRecurring) {
            await createRecurringLessons(userId, data, student, res);
        }
        else {
            await createSingleLesson(userId, data, student, res);
        }
    }
    catch (error) {
        console.error("Create lesson error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.createLesson = createLesson;
//# sourceMappingURL=createLesson.js.map