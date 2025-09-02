"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudent = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const prismaErrorHandler_1 = require("../../utils/prismaErrorHandler");
const validators_1 = require("./validators");
const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const updateData = req.body;
        // Validation
        const validationErrors = (0, validators_1.validateUpdateStudentDto)(updateData);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors[0] });
        }
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
        // Prepare update data - convert empty strings to null for optional fields
        const preparedData = (0, validators_1.prepareUpdateData)(updateData);
        const student = await prisma_1.default.student.update({
            where: { id },
            data: preparedData,
        });
        res.json({
            message: "Ученик успешно обновлен",
            student,
        });
    }
    catch (error) {
        console.error("Update student error:", error);
        if ((0, prismaErrorHandler_1.handlePrismaError)(error, res)) {
            return;
        }
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.updateStudent = updateStudent;
//# sourceMappingURL=updateStudent.js.map