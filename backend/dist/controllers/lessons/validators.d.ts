import { CreateLessonDto } from "../../types";
export declare const validateLessonData: (data: CreateLessonDto) => {
    isValid: boolean;
    error: string;
} | {
    isValid: boolean;
    error?: undefined;
};
export declare const checkSchedulingConflicts: (userId: string, startTime: Date, endTime: Date, prisma: any) => Promise<any>;
//# sourceMappingURL=validators.d.ts.map