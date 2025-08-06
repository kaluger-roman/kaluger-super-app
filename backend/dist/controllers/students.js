"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudent = exports.updateStudent = exports.createStudent = exports.getStudent = exports.getStudents = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
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
        res.status(500).json({ error: "Internal server error" });
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
            return res.status(404).json({ error: "Student not found" });
        }
        res.json({ student });
    }
    catch (error) {
        console.error("Get student error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getStudent = getStudent;
const createStudent = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { name, email, phone, notes, hourlyRate } = req.body;
        // Validation
        if (!name) {
            return res.status(400).json({ error: "Name is required" });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }
        if (hourlyRate && hourlyRate < 0) {
            return res.status(400).json({ error: "Hourly rate must be positive" });
        }
        const student = await prisma_1.default.student.create({
            data: {
                name,
                email,
                phone,
                notes,
                hourlyRate,
                tutorId: userId,
            },
        });
        res.status(201).json({
            message: "Student created successfully",
            student,
        });
    }
    catch (error) {
        console.error("Create student error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.createStudent = createStudent;
const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const updateData = req.body;
        // Validation
        if (updateData.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }
        if (updateData.hourlyRate && updateData.hourlyRate < 0) {
            return res.status(400).json({ error: "Hourly rate must be positive" });
        }
        // Check if student exists and belongs to user
        const existingStudent = await prisma_1.default.student.findFirst({
            where: {
                id,
                tutorId: userId,
            },
        });
        if (!existingStudent) {
            return res.status(404).json({ error: "Student not found" });
        }
        const student = await prisma_1.default.student.update({
            where: { id },
            data: updateData,
        });
        res.json({
            message: "Student updated successfully",
            student,
        });
    }
    catch (error) {
        console.error("Update student error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.updateStudent = updateStudent;
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
            return res.status(404).json({ error: "Student not found" });
        }
        await prisma_1.default.student.delete({
            where: { id },
        });
        res.json({ message: "Student deleted successfully" });
    }
    catch (error) {
        console.error("Delete student error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.deleteStudent = deleteStudent;
//# sourceMappingURL=students.js.map