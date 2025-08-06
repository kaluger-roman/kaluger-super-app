"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpcomingLessons = exports.deleteLesson = exports.updateLesson = exports.createLesson = exports.getLesson = exports.getLessons = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const getLessons = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate, studentId, status, page = "1", limit = "10", } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = { tutorId: userId };
        if (startDate || endDate) {
            where.startTime = {};
            if (startDate)
                where.startTime.gte = new Date(startDate);
            if (endDate)
                where.startTime.lte = new Date(endDate);
        }
        if (studentId) {
            where.studentId = studentId;
        }
        if (status) {
            where.status = status;
        }
        const [lessons, total] = await Promise.all([
            prisma_1.default.lesson.findMany({
                where,
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { startTime: "desc" },
                skip,
                take: limitNum,
            }),
            prisma_1.default.lesson.count({ where }),
        ]);
        res.json({
            lessons,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error("Get lessons error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getLessons = getLessons;
const getLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const lesson = await prisma_1.default.lesson.findFirst({
            where: {
                id,
                tutorId: userId,
            },
            include: {
                student: true,
            },
        });
        if (!lesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }
        res.json({ lesson });
    }
    catch (error) {
        console.error("Get lesson error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getLesson = getLesson;
const createLesson = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { subject, lessonType, description, startTime, endTime, price, studentId, homework, notes, isRecurring, } = req.body;
        // Validation
        if (!subject || !lessonType || !startTime || !endTime || !studentId) {
            return res.status(400).json({
                error: "Subject, lesson type, start time, end time, and student ID are required",
            });
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start >= end) {
            return res
                .status(400)
                .json({ error: "End time must be after start time" });
        }
        if (start < new Date()) {
            return res
                .status(400)
                .json({ error: "Start time must be in the future" });
        }
        if (price && price < 0) {
            return res.status(400).json({ error: "Price must be positive" });
        }
        // Check if student belongs to user
        const student = await prisma_1.default.student.findFirst({
            where: {
                id: studentId,
                tutorId: userId,
            },
        });
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        if (isRecurring) {
            // Создаем регулярные уроки на 3 месяца вперед
            const lessons = [];
            const threeMonthsLater = new Date(start);
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
            let currentStart = new Date(start);
            let currentEnd = new Date(end);
            while (currentStart <= threeMonthsLater) {
                // Check for scheduling conflicts
                const conflicts = await prisma_1.default.lesson.findMany({
                    where: {
                        tutorId: userId,
                        status: {
                            not: "CANCELLED",
                        },
                        OR: [
                            {
                                startTime: {
                                    lt: currentEnd,
                                },
                                endTime: {
                                    gt: currentStart,
                                },
                            },
                        ],
                    },
                });
                if (conflicts.length === 0) {
                    const lessonData = {
                        subject,
                        lessonType,
                        description: currentStart.getTime() === start.getTime()
                            ? description
                            : undefined,
                        startTime: currentStart,
                        endTime: currentEnd,
                        price: price || student.hourlyRate,
                        homework: currentStart.getTime() === start.getTime() ? homework : undefined,
                        notes: currentStart.getTime() === start.getTime() ? notes : undefined,
                        isRecurring: true,
                        tutorId: userId,
                        studentId,
                    };
                    lessons.push(lessonData);
                }
                // Move to next week
                currentStart = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                currentEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
            }
            if (lessons.length === 0) {
                return res.status(400).json({
                    error: "Cannot create recurring lessons due to scheduling conflicts",
                });
            }
            // Create all lessons
            const createdLessons = await prisma_1.default.lesson.createMany({
                data: lessons,
            });
            // Get the first lesson to return
            const firstLesson = await prisma_1.default.lesson.findFirst({
                where: {
                    tutorId: userId,
                    startTime: start,
                    studentId,
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            res.status(201).json({
                lesson: firstLesson,
                message: `Created ${createdLessons.count} recurring lessons`,
            });
        }
        else {
            // Check for scheduling conflicts for single lesson
            const conflicts = await prisma_1.default.lesson.findMany({
                where: {
                    tutorId: userId,
                    status: {
                        not: "CANCELLED",
                    },
                    OR: [
                        {
                            startTime: {
                                lt: end,
                            },
                            endTime: {
                                gt: start,
                            },
                        },
                    ],
                },
            });
            if (conflicts.length > 0) {
                return res.status(400).json({
                    error: "Time slot conflicts with existing lesson",
                });
            }
            const lesson = await prisma_1.default.lesson.create({
                data: {
                    subject,
                    lessonType,
                    description,
                    startTime: start,
                    endTime: end,
                    price: price || student.hourlyRate,
                    homework,
                    notes,
                    isRecurring: false,
                    tutorId: userId,
                    studentId,
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            res.status(201).json({ lesson });
        }
    }
    catch (error) {
        console.error("Create lesson error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.createLesson = createLesson;
const updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const updateData = req.body;
        // Check if lesson exists and belongs to user
        const existingLesson = await prisma_1.default.lesson.findFirst({
            where: {
                id,
                tutorId: userId,
            },
        });
        if (!existingLesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }
        // Validation for time updates
        if (updateData.startTime || updateData.endTime) {
            const start = updateData.startTime
                ? new Date(updateData.startTime)
                : existingLesson.startTime;
            const end = updateData.endTime
                ? new Date(updateData.endTime)
                : existingLesson.endTime;
            if (start >= end) {
                return res
                    .status(400)
                    .json({ error: "End time must be after start time" });
            }
            // Check for scheduling conflicts (excluding current lesson)
            const conflictingLesson = await prisma_1.default.lesson.findFirst({
                where: {
                    id: { not: id },
                    tutorId: userId,
                    status: { not: "CANCELLED" },
                    OR: [
                        {
                            startTime: {
                                lt: end,
                            },
                            endTime: {
                                gt: start,
                            },
                        },
                    ],
                },
            });
            if (conflictingLesson) {
                return res
                    .status(409)
                    .json({ error: "Time slot conflicts with existing lesson" });
            }
        }
        if (updateData.price && updateData.price < 0) {
            return res.status(400).json({ error: "Price must be positive" });
        }
        if (updateData.grade && (updateData.grade < 1 || updateData.grade > 5)) {
            return res.status(400).json({ error: "Grade must be between 1 and 5" });
        }
        const lesson = await prisma_1.default.lesson.update({
            where: { id },
            data: updateData,
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        res.json({
            message: "Lesson updated successfully",
            lesson,
        });
    }
    catch (error) {
        console.error("Update lesson error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.updateLesson = updateLesson;
const deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteAllFuture } = req.body;
        const userId = req.user?.userId;
        // Check if lesson exists and belongs to user
        const existingLesson = await prisma_1.default.lesson.findFirst({
            where: {
                id,
                tutorId: userId,
            },
        });
        if (!existingLesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }
        if (deleteAllFuture && existingLesson.isRecurring) {
            // Delete all future recurring lessons with the same pattern
            const now = new Date();
            await prisma_1.default.lesson.deleteMany({
                where: {
                    tutorId: userId,
                    studentId: existingLesson.studentId,
                    subject: existingLesson.subject,
                    lessonType: existingLesson.lessonType,
                    isRecurring: true,
                    status: { notIn: ["CANCELLED", "COMPLETED"] },
                },
            });
            res.json({
                message: "All future recurring lessons deleted successfully",
            });
        }
        else {
            await prisma_1.default.lesson.delete({
                where: { id },
            });
            res.json({ message: "Lesson deleted successfully" });
        }
    }
    catch (error) {
        console.error("Delete lesson error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.deleteLesson = deleteLesson;
const getUpcomingLessons = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const lessons = await prisma_1.default.lesson.findMany({
            where: {
                tutorId: userId,
                startTime: {
                    gte: now,
                    lte: nextWeek,
                },
                status: { in: ["SCHEDULED", "RESCHEDULED"] },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { startTime: "asc" },
        });
        res.json({ lessons });
    }
    catch (error) {
        console.error("Get upcoming lessons error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.getUpcomingLessons = getUpcomingLessons;
//# sourceMappingURL=lessons.js.map