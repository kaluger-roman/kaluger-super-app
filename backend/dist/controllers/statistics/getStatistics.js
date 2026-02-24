"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatistics = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const utils_1 = require("./utils");
const time_1 = require("../../utils/time");
const getStatistics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const now = (0, time_1.truncateToMinute)(new Date());
        const where = (0, utils_1.buildStatisticsWhere)(userId, startDate, endDate);
        // If client provided startDate/endDate, interpret those as UTC-day bounds
        // to avoid excluding times when client sends ISO date from toISOString().
        if (startDate || endDate) {
            const utcGte = startDate
                ? new Date(`${startDate}T00:00:00.000Z`)
                : undefined;
            const utcLte = endDate
                ? new Date(`${endDate}T23:59:59.999Z`)
                : undefined;
            if (utcGte || utcLte) {
                where.startTime = {
                    ...(utcGte ? { gte: utcGte } : {}),
                    ...(utcLte ? { lte: utcLte } : {}),
                };
            }
        }
        const lastMonthRange = (0, utils_1.getLastMonthRange)();
        const [completedLessons, cancelledLessons, totalLessons, earnings, lastMonthEarnings, upcomingLessons, prepaidIncome, upcomingIncome, trialLessonsCount, currentUser,] = await Promise.all([
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
            prisma_1.default.user.findUnique({
                where: { id: userId },
                select: { taxRate: true },
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
        const twentyFourHoursAgo = (0, time_1.truncateToMinute)(new Date(now.getTime() - 24 * 60 * 60 * 1000));
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
        const earningsValue = earnings._sum.price || 0;
        const taxRate = currentUser?.taxRate ?? 6;
        const taxAmount = Math.round(earningsValue * taxRate / 100);
        res.json({
            completedLessons,
            cancelledLessons,
            totalLessons,
            upcomingLessons,
            earnings: earningsValue,
            lastMonthEarnings: lastMonthEarnings._sum.price || 0,
            lostEarnings: lostEarnings._sum.price || 0,
            prepaidIncome: prepaidIncome._sum.price || 0,
            upcomingIncome: upcomingIncome._sum.price || 0,
            trialLessonsCount: trialLessonsCount || 0,
            unpaidDebtSum: unpaid._sum.price || 0,
            unpaidDebtCount: unpaid._count.id || 0,
            unpaidDebtOver24hSum: unpaidOver24h._sum.price || 0,
            unpaidDebtOver24hCount: unpaidOver24h._count.id || 0,
            taxAmount,
        });
    }
    catch (error) {
        console.error("Get statistics error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getStatistics = getStatistics;
//# sourceMappingURL=getStatistics.js.map