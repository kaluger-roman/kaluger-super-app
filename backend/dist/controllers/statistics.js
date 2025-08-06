"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentStatistics = exports.getLessonsByType = exports.getLessonsBySubject = exports.getStatistics = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const getStatistics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const where = {
            tutorId: userId,
            startTime: {
                gte: startDate ? new Date(startDate) : currentMonthStart,
                lte: endDate ? new Date(endDate) : currentMonthEnd,
            },
        };
        const [completedLessons, cancelledLessons, totalLessons, earnings, lastMonthEarnings, upcomingLessons,] = await Promise.all([
            prisma_1.default.lesson.count({
                where: { ...where, status: "COMPLETED" },
            }),
            prisma_1.default.lesson.count({
                where: { ...where, status: "CANCELLED" },
            }),
            prisma_1.default.lesson.count({ where }),
            prisma_1.default.lesson.aggregate({
                where: { ...where, status: "COMPLETED", isPaid: true },
                _sum: { price: true },
            }),
            prisma_1.default.lesson.aggregate({
                where: {
                    tutorId: userId,
                    startTime: { gte: lastMonthStart, lte: lastMonthEnd },
                    status: "COMPLETED",
                    isPaid: true,
                },
                _sum: { price: true },
            }),
            prisma_1.default.lesson.count({
                where: {
                    tutorId: userId,
                    startTime: { gte: now },
                    status: { in: ["SCHEDULED", "RESCHEDULED"] },
                },
            }),
        ]);
        const lostEarnings = await prisma_1.default.lesson.aggregate({
            where: { ...where, status: "CANCELLED" },
            _sum: { price: true },
        });
        res.json({
            completedLessons,
            cancelledLessons,
            totalLessons,
            upcomingLessons,
            earnings: earnings._sum.price || 0,
            lastMonthEarnings: lastMonthEarnings._sum.price || 0,
            lostEarnings: lostEarnings._sum.price || 0,
        });
    }
    catch (error) {
        console.error("Get statistics error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getStatistics = getStatistics;
// Дополнительные статистические контроллеры можно добавить здесь
const getLessonsBySubject = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const where = {
            tutorId: userId,
            startTime: {
                gte: startDate ? new Date(startDate) : currentMonthStart,
                lte: endDate ? new Date(endDate) : currentMonthEnd,
            },
        };
        const lessonsBySubject = await prisma_1.default.lesson.groupBy({
            by: ["subject"],
            where,
            _count: {
                id: true,
            },
            _sum: {
                price: true,
            },
        });
        res.json({ lessonsBySubject });
    }
    catch (error) {
        console.error("Get lessons by subject error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getLessonsBySubject = getLessonsBySubject;
const getLessonsByType = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const where = {
            tutorId: userId,
            startTime: {
                gte: startDate ? new Date(startDate) : currentMonthStart,
                lte: endDate ? new Date(endDate) : currentMonthEnd,
            },
        };
        const lessonsByType = await prisma_1.default.lesson.groupBy({
            by: ["lessonType"],
            where,
            _count: {
                id: true,
            },
            _sum: {
                price: true,
            },
        });
        res.json({ lessonsByType });
    }
    catch (error) {
        console.error("Get lessons by type error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getLessonsByType = getLessonsByType;
const getStudentStatistics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const where = {
            tutorId: userId,
            startTime: {
                gte: startDate ? new Date(startDate) : currentMonthStart,
                lte: endDate ? new Date(endDate) : currentMonthEnd,
            },
        };
        const studentStats = await prisma_1.default.lesson.groupBy({
            by: ["studentId"],
            where,
            _count: {
                id: true,
            },
            _sum: {
                price: true,
            },
        });
        // Получаем информацию о студентах
        const studentIds = studentStats.map((stat) => stat.studentId);
        const students = await prisma_1.default.student.findMany({
            where: {
                id: { in: studentIds },
                tutorId: userId,
            },
            select: {
                id: true,
                name: true,
            },
        });
        const enrichedStats = studentStats.map((stat) => ({
            ...stat,
            student: students.find((s) => s.id === stat.studentId),
        }));
        res.json({ studentStatistics: enrichedStats });
    }
    catch (error) {
        console.error("Get student statistics error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getStudentStatistics = getStudentStatistics;
//# sourceMappingURL=statistics.js.map