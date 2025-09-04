"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLesson = exports.getLessons = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const time_1 = require("../../utils/time");
const getLessons = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate, studentId, status, upcoming, currentTime, page = "1", limit = "10", } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { tutorId: userId };
        // Специальная логика для предстоящих уроков
        if (upcoming === "true" && currentTime) {
            const now = (0, time_1.truncateToMinute)(new Date(currentTime));
            where.OR = [
                { status: "IN_PROGRESS" },
                {
                    status: { in: ["SCHEDULED", "RESCHEDULED"] },
                    startTime: { gte: now },
                },
            ];
        }
        else {
            // Обычная логика фильтрации
            if (startDate || endDate) {
                where.startTime = {};
                if (startDate)
                    where.startTime.gte = (0, time_1.truncateToMinute)(new Date(startDate));
                if (endDate)
                    where.startTime.lte = (0, time_1.truncateToMinute)(new Date(endDate));
            }
            if (studentId) {
                where.studentId = studentId;
            }
            if (status && typeof status === "string") {
                // Support multiple statuses separated by comma
                const statuses = status.split(",").map((s) => s.trim());
                if (statuses.length > 1) {
                    where.status = { in: statuses };
                }
                else {
                    where.status = status;
                }
            }
        }
        const [lessons, total] = await Promise.all([
            prisma_1.default.lesson.findMany({
                where,
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { startTime: upcoming === "true" ? "asc" : "desc" },
                skip,
                take: limitNum,
            }),
            prisma_1.default.lesson.count({ where }),
        ]);
        res.json({
            lessons,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error("Get lessons error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getLessons = getLessons;
const getLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const lesson = await prisma_1.default.lesson.findFirst({
            where: {
                id,
                tutorId: userId,
            },
            include: {
                student: true,
            },
        });
        if (!lesson) {
            return res.status(404).json({ error: "Урок не найден" });
        }
        res.json({ lesson });
    }
    catch (error) {
        console.error("Get lesson error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getLesson = getLesson;
//# sourceMappingURL=getLessons.js.map