"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatistics = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const utils_1 = require("./utils");
const getStatistics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const now = new Date();
        const where = (0, utils_1.buildStatisticsWhere)(userId, startDate, endDate);
        const lastMonthRange = (0, utils_1.getLastMonthRange)();
        const [completedLessons, cancelledLessons, totalLessons, earnings, lastMonthEarnings, upcomingLessons, prepaidIncome, upcomingIncome, trialLessonsCount,] = await Promise.all([
            prisma_1.default.lesson.count({
                where: { ...where, status: "COMPLETED" },
            }),
            prisma_1.default.lesson.count({
                where: { ...where, status: "CANCELLED" },
            }),
            prisma_1.default.lesson.count({ where }),
            prisma_1.default.lesson.aggregate({
                where: { ...where, isPaid: true, status: "COMPLETED" },
                _sum: { price: true },
            }),
            prisma_1.default.lesson.aggregate({
                where: {
                    tutorId: userId,
                    startTime: lastMonthRange,
                    isPaid: true,
                },
                _sum: { price: true },
            }),
            prisma_1.default.lesson.count({
                where: {
                    ...where,
                    status: { in: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
                },
            }),
            prisma_1.default.lesson.aggregate({
                where: {
                    tutorId: userId,
                    isPaid: true,
                    status: { in: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
                },
                _sum: { price: true },
            }),
            prisma_1.default.lesson.aggregate({
                where: {
                    ...where,
                    tutorId: userId,
                    status: { in: ["SCHEDULED", "RESCHEDULED", "IN_PROGRESS"] },
                },
                _sum: { price: true },
            }),
            prisma_1.default.lesson.count({
                where: { ...where, OR: [{ price: 0 }, { price: null }] },
            }),
        ]);
        const lostEarnings = await prisma_1.default.lesson.aggregate({
            where: { ...where, status: "CANCELLED" },
            _sum: { price: true },
        });
        const unpaid = await prisma_1.default.lesson.aggregate({
            where: { ...where, status: "COMPLETED", isPaid: false, price: { gt: 0 } },
            _count: { id: true },
            _sum: { price: true },
        });
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const unpaidOver24h = await prisma_1.default.lesson.aggregate({
            where: {
                ...where,
                status: "COMPLETED",
                isPaid: false,
                endTime: { lte: twentyFourHoursAgo },
                price: { gt: 0 },
            },
            _count: { id: true },
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
            prepaidIncome: prepaidIncome._sum.price || 0,
            upcomingIncome: upcomingIncome._sum.price || 0,
            trialLessonsCount: trialLessonsCount || 0,
            unpaidDebtSum: unpaid._sum.price || 0,
            unpaidDebtCount: unpaid._count.id || 0,
            unpaidDebtOver24hSum: unpaidOver24h._sum.price || 0,
            unpaidDebtOver24hCount: unpaidOver24h._count.id || 0,
        });
    }
    catch (error) {
        console.error("Get statistics error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getStatistics = getStatistics;
//# sourceMappingURL=getStatistics.js.map