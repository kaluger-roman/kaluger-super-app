"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentStatistics = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const utils_1 = require("./utils");
const getStudentStatistics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const where = (0, utils_1.buildStatisticsWhere)(userId, startDate, endDate);
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
        // Получаем информацию о учениках
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
//# sourceMappingURL=getStudentStats.js.map