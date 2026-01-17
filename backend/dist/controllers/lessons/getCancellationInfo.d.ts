import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { Lesson } from "@prisma/client";
export declare const findNextUnpaidLesson: (tutorId: string, cancelledLesson: Lesson) => Promise<({
    student: {
        name: string;
    };
} & {
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
}) | null>;
export declare const getLessonCancellationInfo: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=getCancellationInfo.d.ts.map