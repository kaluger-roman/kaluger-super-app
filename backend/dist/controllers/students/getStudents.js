"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudent = exports.getStudents = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const getStudents = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const students = await prisma_1.default.student.findMany({
            where: { tutorId: userId },
            include: {
                lessons: {
                    orderBy: { startTime: "desc" },
                    take: 5, // Last 5 lessons
                },
            },
            orderBy: { name: "asc" },
        });
        res.json({ students });
    }
    catch (error) {
        console.error("Get students error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getStudents = getStudents;
const getStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const student = await prisma_1.default.student.findFirst({
            where: {
                id,
                tutorId: userId,
            },
            include: {
                lessons: {
                    orderBy: { startTime: "desc" },
                },
            },
        });
        if (!student) {
            return res.status(404).json({ error: "Ученик не найден" });
        }
        res.json({ student });
    }
    catch (error) {
        console.error("Get student error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.getStudent = getStudent;
//# sourceMappingURL=getStudents.js.map