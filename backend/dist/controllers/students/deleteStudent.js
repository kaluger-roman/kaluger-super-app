"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudent = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        // Check if student exists and belongs to user
        const existingStudent = await prisma_1.default.student.findFirst({
            where: {
                id,
                tutorId: userId,
            },
        });
        if (!existingStudent) {
            return res.status(404).json({ error: "Ученик не найден" });
        }
        await prisma_1.default.student.delete({
            where: { id },
        });
        res.json({ message: "Ученик успешно удален" });
    }
    catch (error) {
        console.error("Delete student error:", error);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.deleteStudent = deleteStudent;
//# sourceMappingURL=deleteStudent.js.map