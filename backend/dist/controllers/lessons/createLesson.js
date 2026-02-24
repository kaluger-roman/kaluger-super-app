"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLesson = void 0;
const wsManager_1 = require("../../lib/wsManager");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const validators_1 = require("./validators");
const time_1 = require("../../utils/time");
const reminderScheduler_1 = require("../../services/reminderScheduler");
const createSingleLesson = async (userId, data, student, res) => {
    const { subject, lessonType, description, startTime, endTime, price, homework, notes, studentId, } = data;
    const start = (0, time_1.truncateToMinute)(new Date(startTime));
    const end = (0, time_1.truncateToMinute)(new Date(endTime));
    let computedStatus = undefined;
    const now = (0, time_1.truncateToMinute)(new Date());
    if (end.getTime() <= now.getTime()) {
        computedStatus = "COMPLETED";
    }
    else if (start.getTime() <= now.getTime() &&
        end.getTime() > now.getTime()) {
        computedStatus = "IN_PROGRESS";
    }
    const conflicts = await (0, validators_1.checkSchedulingConflicts)(userId, start, end, prisma_1.default);
    if (conflicts.length > 0) {
        return res
            .status(400)
            .json({ error: "Временной слот конфликтует с существующим уроком" });
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
            ...(computedStatus ? { status: computedStatus } : {}),
            isRecurring: false,
            tutorId: userId,
            studentId,
        },
        include: { student: true },
    });
    res.status(201).json({ lesson });
    // Schedule reminders for the new lesson
    if (lesson.status === "SCHEDULED") {
        (0, reminderScheduler_1.scheduleRemindersForLesson)(lesson.id).catch((err) => console.error("Failed to schedule reminders:", err));
    }
    const wsManager = (0, wsManager_1.getWebSocketManager)();
    if (wsManager) {
        wsManager.broadcastLessonStatusUpdate(lesson.id, lesson.status, userId);
    }
};
const createRecurringLessons = async (userId, data, student, res) => {
    const { subject, lessonType, description, startTime, endTime, price, homework, notes, studentId, } = data;
    const start = (0, time_1.truncateToMinute)(new Date(startTime));
    const end = (0, time_1.truncateToMinute)(new Date(endTime));
    const lessons = [];
    const threeMonthsLater = (0, time_1.truncateToMinute)(new Date(start));
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    let currentStart = (0, time_1.truncateToMinute)(new Date(start));
    let currentEnd = (0, time_1.truncateToMinute)(new Date(end));
    while (currentStart <= threeMonthsLater) {
        const conflicts = await (0, validators_1.checkSchedulingConflicts)(userId, currentStart, currentEnd, prisma_1.default);
        if (conflicts.length === 0) {
            const lessonData = {
                subject,
                lessonType,
                description: currentStart.getTime() === start.getTime() ? description : undefined,
                startTime: (0, time_1.truncateToMinute)(currentStart),
                endTime: (0, time_1.truncateToMinute)(currentEnd),
                price: price || student.hourlyRate,
                homework: currentStart.getTime() === start.getTime() ? homework : undefined,
                notes: currentStart.getTime() === start.getTime() ? notes : undefined,
                isRecurring: true,
                tutorId: userId,
                studentId,
            };
            lessons.push(lessonData);
        }
        currentStart = (0, time_1.truncateToMinute)(new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000));
        currentEnd = (0, time_1.truncateToMinute)(new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000));
    }
    if (lessons.length === 0) {
        return res.status(400).json({
            error: "Невозможно создать регулярные уроки из-за конфликтов в расписании",
        });
    }
    const createdLessons = await prisma_1.default.lesson.createMany({ data: lessons });
    const firstLesson = await prisma_1.default.lesson.findFirst({
        where: { tutorId: userId, startTime: start, studentId },
        include: { student: true },
    });
    res.status(201).json({
        lesson: firstLesson,
        message: `Создано ${createdLessons.count} регулярных уроков`,
    });
    // Schedule reminders for all new recurring lessons
    const newLessons = await prisma_1.default.lesson.findMany({
        where: {
            tutorId: userId,
            studentId,
            isRecurring: true,
            status: "SCHEDULED",
            startTime: { gte: start },
        },
    });
    for (const l of newLessons) {
        (0, reminderScheduler_1.scheduleRemindersForLesson)(l.id).catch((err) => console.error("Failed to schedule reminders for recurring lesson:", err));
    }
    const wsManager = (0, wsManager_1.getWebSocketManager)();
    if (wsManager && firstLesson) {
        wsManager.broadcastLessonStatusUpdate(firstLesson.id, firstLesson.status, userId);
    }
};
const createLesson = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const data = req.body;
        const validation = (0, validators_1.validateLessonData)(data);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }
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