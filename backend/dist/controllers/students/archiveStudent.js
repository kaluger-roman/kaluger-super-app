"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unarchiveStudent = exports.archiveStudent = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const archiveStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const { archiveReason, archiveComment } = req.body;
        const userId = req.user?.userId;
        const existingStudent = await prisma_1.default.student.findFirst({
            where: { id, tutorId: userId },
        });
        if (!existingStudent) {
            return res.status(404).json({ error: "Ученик не найден" });
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            await tx.lesson.deleteMany({
                where: {
                    studentId: id,
                    startTime: { gte: new Date() },
                },
            });
            const student = await tx.student.update({
                where: { id },
                data: {
                    archived: true,
                    archivedAt: new Date(),
                    archiveReason: archiveReason || null,
                    archiveComment: archiveComment || null,
                },
            });
            return student;
        });
        res.json({ student: result });
    }
    catch (error) {
        console.error("Archive student error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.archiveStudent = archiveStudent;
const unarchiveStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const existingStudent = await prisma_1.default.student.findFirst({
            where: { id, tutorId: userId },
        });
        if (!existingStudent) {
            return res.status(404).json({ error: "Ученик не найден" });
        }
        const student = await prisma_1.default.student.update({
            where: { id },
            data: {
                archived: false,
                archivedAt: null,
                archiveReason: null,
                archiveComment: null,
            },
        });
        res.json({ student });
    }
    catch (error) {
        console.error("Unarchive student error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.unarchiveStudent = unarchiveStudent;
//# sourceMappingURL=archiveStudent.js.map