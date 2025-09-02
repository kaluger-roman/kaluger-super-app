"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLessonsByType = exports.getLessonsBySubject = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const utils_1 = require("./utils");
const getLessonsBySubject = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        const where = (0, utils_1.buildStatisticsWhere)(userId, startDate, endDate);
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
        const where = (0, utils_1.buildStatisticsWhere)(userId, startDate, endDate);
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
//# sourceMappingURL=getLessonStats.js.map