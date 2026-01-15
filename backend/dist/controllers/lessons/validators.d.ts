import { CreateLessonDto } from "../../types";
import type { PrismaClient } from "@prisma/client";
export declare const validateLessonData: (data: CreateLessonDto) => {
    isValid: boolean;
    error: string;
} | {
    isValid: boolean;
    error?: undefined;
};
export declare const checkSchedulingConflicts: (userId: string, startTime: Date, endTime: Date, prisma: PrismaClient) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    notes: string | null;
    grade: number | null;
    tutorId: string;
    subject: import(".prisma/client").$Enums.Subject;
    lessonType: import(".prisma/client").$Enums.LessonType;
    description: string | null;
    startTime: Date;
    endTime: Date;
    price: number | null;
    isPaid: boolean;
    paymentDate: Date | null;
    isHomeworkSentByTeacher: boolean;
    homework: string | null;
    status: import(".prisma/client").$Enums.LessonStatus;
    isRecurring: boolean;
    studentId: string;
}[]>;
//# sourceMappingURL=validators.d.ts.map