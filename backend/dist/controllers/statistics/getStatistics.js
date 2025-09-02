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
        const [completedLessons, cancelledLessons, totalLessons, earnings, lastMonthEarnings, upcomingLessons,] = await Promise.all([
            prisma_1.default.lesson.count({
                where: { ...where, status: "COMPLETED" },
            }),
            prisma_1.default.lesson.count({
                where: { ...where, status: "CANCELLED" },
            }),
            prisma_1.default.lesson.count({ where }),
            prisma_1.default.lesson.aggregate({
                where: { ...where, isPaid: true },
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
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getStatistics = getStatistics;
//# sourceMappingURL=getStatistics.js.map