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
        const { startDate, endDate, studentId, status, upcoming, currentTime, page = "1", limit = "10", weekly, noPagination, weekStart, onlyUnpaid, onlyWithoutHomework, } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { tutorId: userId };
        if (weekly === "true" && weekStart) {
            const startOfWeek = (0, time_1.truncateToMinute)(new Date(weekStart));
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            where.startTime = {
                gte: startOfWeek,
                lte: endOfWeek,
            };
        }
        else {
            if (startDate || endDate) {
                const dtFilter = {};
                if (startDate)
                    dtFilter.gte = (0, time_1.truncateToMinute)(new Date(startDate));
                if (endDate)
                    dtFilter.lte = (0, time_1.truncateToMinute)(new Date(endDate));
                where.startTime = dtFilter;
            }
        }
        if (studentId) {
            where.studentId = studentId;
        }
        if (onlyUnpaid === "true") {
            where.isPaid = false;
            where.price = { gt: 0 };
        }
        if (onlyWithoutHomework === "true") {
            where.isHomeworkSentByTeacher = false;
        }
        if (weekly !== "true") {
            const upcomingFlag = upcoming === "true" && !!currentTime;
            if (upcomingFlag) {
                const now = (0, time_1.truncateToMinute)(new Date(currentTime));
                where.OR = [
                    { status: "IN_PROGRESS" },
                    {
                        status: { in: ["SCHEDULED", "RESCHEDULED"] },
                        startTime: { gte: now },
                    },
                ];
            }
            else if (status && typeof status === "string") {
                const statuses = status
                    .split(",")
                    .map((s) => s.trim());
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
                    student: true,
                },
                orderBy: {
                    startTime: upcoming === "true" || weekly === "true" ? "asc" : "desc",
                },
                // Если явно запрошено отключение пагинации или это weekly-запрос — не используем пагинацию
                ...(weekly !== "true" &&
                    noPagination !== "true" && { skip, take: limitNum }),
            }),
            prisma_1.default.lesson.count({ where }),
        ]);
        res.json({
            lessons,
            pagination: weekly === "true" || noPagination === "true"
                ? undefined
                : {
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