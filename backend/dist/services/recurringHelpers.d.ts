export declare const getRecurringLessonKey: (lesson: any) => string;
export declare const groupRecurringLessonsByPattern: (lessons: Array<any>) => Map<string, any>;
export declare const shiftFutureRecurringLessons: (existingLesson: any, newStart: Date, newEnd: Date) => Promise<{
    shifted: number;
    conflicts?: Array<{
        lessonId: string;
        conflictingLessonId: string;
    }>;
}>;
//# sourceMappingURL=recurringHelpers.d.ts.map