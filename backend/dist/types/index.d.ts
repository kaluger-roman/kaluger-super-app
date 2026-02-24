export type CreateUserDto = {
    email: string;
    password: string;
    name: string;
};
export type LoginDto = {
    email: string;
    password: string;
};
export type CreateStudentDto = {
    name: string;
    contactMethod: "WHATSAPP" | "TELEGRAM";
    parentPhone?: string | null;
    parentName?: string | null;
    parentContactMethod?: "WHATSAPP" | "TELEGRAM" | null;
    telegramNick?: string | null;
    parentTelegramNick?: string | null;
    phone?: string | null;
    notes?: string | null;
    hourlyRate?: number | null;
    grade?: number | null;
};
export type UpdateStudentDto = Partial<CreateStudentDto>;
export type CreateLessonDto = {
    subject: "MATHEMATICS" | "PHYSICS";
    lessonType: "EGE" | "OGE" | "OLYMPICS" | "SCHOOL";
    description?: string;
    startTime: Date;
    endTime: Date;
    price?: number;
    studentId: string;
    homework?: string;
    notes?: string;
    isRecurring?: boolean;
};
export type UpdateLessonDto = Partial<CreateLessonDto> & {
    isPaid?: boolean;
    paymentDate?: Date;
    isHomeworkSentByTeacher?: boolean;
    grade?: number;
    status?: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "IN_PROGRESS";
};
export type UpdateProfileDto = {
    name?: string;
    taxRate?: number;
};
export type JwtPayload = {
    userId: string;
    email: string;
};
export type VerifyEmailDto = {
    email: string;
    code: string;
};
export type ResendVerificationDto = {
    email: string;
};
export type NewsItemResponse = {
    id: string;
    title: string;
    content: string;
    version: string | null;
    publishedAt: string;
    createdAt: string;
};
export type NewsPaginationResponse = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};
export type PushSubscriptionDto = {
    subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    };
    deviceName?: string;
};
export type PushUnsubscribeDto = {
    endpoint: string;
};
export type ReminderSettingsDto = {
    enabled?: boolean;
    intervals?: number[];
    muteWhenInLesson?: boolean;
};
export type ReminderSettingsResponse = {
    enabled: boolean;
    intervals: number[];
    muteWhenInLesson: boolean;
};
export type PushSubscriptionResponse = {
    id: string;
    endpoint: string;
    deviceName: string | null;
    createdAt: string;
};
export type PushNotificationPayload = {
    title: string;
    body: string;
    tag: string;
    data: {
        type: "lesson_reminder";
        lessonId: string;
        url: string;
    };
};
//# sourceMappingURL=index.d.ts.map