"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStudent = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const prismaErrorHandler_1 = require("../../utils/prismaErrorHandler");
const validators_1 = require("./validators");
const createStudent = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const data = req.body;
        // Validation
        const validationErrors = (0, validators_1.validateCreateStudentDto)(data);
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors[0] });
        }
        const student = await prisma_1.default.student.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                grade: data.grade,
                notes: data.notes,
                hourlyRate: data.hourlyRate,
                tutorId: userId,
            },
        });
        res.status(201).json({
            message: "Ученик успешно создан",
            student,
        });
    }
    catch (error) {
        console.error("Create student error:", error);
        if ((0, prismaErrorHandler_1.handlePrismaError)(error, res)) {
            return;
        }
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
};
exports.createStudent = createStudent;
//# sourceMappingURL=createStudent.js.map