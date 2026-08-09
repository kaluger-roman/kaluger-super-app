import { apiRequest } from "./api";

export const resetDatabase = async (): Promise<void> => {
  await apiRequest("/api/__test__/reset", { method: "POST" });
};

export type CreatedUser = {
  user: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
    taxEnabled: boolean;
  };
  token: string;
};

export const createVerifiedUser = async (input: {
  email: string;
  password: string;
  name: string;
  taxEnabled?: boolean;
}): Promise<CreatedUser> =>
  apiRequest<CreatedUser>("/api/__test__/users", {
    method: "POST",
    body: input,
    expectStatus: 201,
  });

export type StudentSeed = {
  name: string;
  contactMethod?: "WHATSAPP" | "TELEGRAM";
  hourlyRate?: number;
  grade?: number;
  phone?: string;
  notes?: string;
  archived?: boolean;
  archiveReason?: string;
};

export const createStudentFor = async (
  userId: string,
  data: StudentSeed,
): Promise<{ student: { id: string; name: string; hourlyRate: number | null } }> =>
  apiRequest(`/api/__test__/users/${userId}/students`, {
    method: "POST",
    body: data,
    expectStatus: 201,
  });

export type LessonSeed = {
  tutorId: string;
  studentId: string;
  startTime: string | Date;
  endTime: string | Date;
  price?: number;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | "IN_PROGRESS";
  isPaid?: boolean;
  paymentDate?: string | Date | null;
  isRecurring?: boolean;
  subject?: "MATHEMATICS" | "PHYSICS";
  lessonType?: "EGE" | "OGE" | "OLYMPICS" | "SCHOOL";
};

export const createLesson = async (
  data: LessonSeed,
): Promise<{
  lesson: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    isPaid: boolean;
  };
}> =>
  apiRequest("/api/__test__/lessons", {
    method: "POST",
    body: {
      ...data,
      startTime:
        data.startTime instanceof Date ? data.startTime.toISOString() : data.startTime,
      endTime:
        data.endTime instanceof Date ? data.endTime.toISOString() : data.endTime,
      paymentDate:
        data.paymentDate instanceof Date
          ? data.paymentDate.toISOString()
          : data.paymentDate,
    },
    expectStatus: 201,
  });

export const patchLesson = async (
  id: string,
  patch: Partial<{
    startTime: string | Date;
    endTime: string | Date;
    status: string;
    isPaid: boolean;
    paymentDate: string | Date | null;
  }>,
): Promise<void> => {
  await apiRequest(`/api/__test__/lessons/${id}`, {
    method: "PATCH",
    body: {
      ...patch,
      startTime:
        patch.startTime instanceof Date ? patch.startTime.toISOString() : patch.startTime,
      endTime:
        patch.endTime instanceof Date ? patch.endTime.toISOString() : patch.endTime,
      paymentDate:
        patch.paymentDate instanceof Date
          ? patch.paymentDate.toISOString()
          : patch.paymentDate,
    },
  });
};

export const setTaxPeriodsFor = async (
  userId: string,
  periods: Array<{ startDate: string | Date; rate: number }>,
  taxEnabled = true,
): Promise<void> => {
  await apiRequest(`/api/__test__/users/${userId}/tax-periods`, {
    method: "POST",
    body: {
      periods: periods.map((p) => ({
        startDate:
          p.startDate instanceof Date ? p.startDate.toISOString() : p.startDate,
        rate: p.rate,
      })),
      taxEnabled,
    },
  });
};

export const seedNews = async (
  items: Array<{
    title: string;
    content: string;
    publishedAt?: string | Date;
    version?: string;
  }>,
): Promise<void> => {
  await apiRequest("/api/__test__/news", {
    method: "POST",
    body: {
      items: items.map((item) => ({
        ...item,
        publishedAt:
          item.publishedAt instanceof Date
            ? item.publishedAt.toISOString()
            : item.publishedAt,
      })),
    },
  });
};

export const runLessonStatusTick = async (): Promise<void> => {
  await apiRequest("/api/__test__/run-lesson-status-tick", { method: "POST" });
};

export const runRecurringLessonsTick = async (): Promise<void> => {
  await apiRequest("/api/__test__/run-recurring-lessons-tick", {
    method: "POST",
  });
};

export const getLessonsFor = async (
  tutorId: string,
): Promise<{
  lessons: Array<{
    id: string;
    startTime: string;
    status: string;
    isPaid: boolean;
    paymentDate: string | null;
    price: string | number | null;
    isRecurring: boolean;
    studentId: string | null;
    prospectName: string | null;
  }>;
}> =>
  apiRequest(
    `/api/__test__/lessons?tutorId=${encodeURIComponent(tutorId)}`,
  );

export const getStudentsFor = async (
  userId: string,
  archived = false,
): Promise<{
  students: Array<{ id: string; name: string; archived: boolean }>;
}> =>
  apiRequest(
    `/api/__test__/users/${userId}/students?archived=${archived}`,
  );

export const getScheduledReminders = async (
  userId: string,
): Promise<{
  reminders: Array<{
    id: string;
    intervalMinutes: number;
    status: string;
    lessonId: string;
  }>;
}> => apiRequest(`/api/__test__/users/${userId}/scheduled-reminders`);

export const getPushSubscriptionsFor = async (
  userId: string,
): Promise<{
  subscriptions: Array<{ id: string; endpoint: string }>;
}> => apiRequest(`/api/__test__/users/${userId}/push-subscriptions`);

export const issueStudentInvitation = async (
  tutorToken: string,
  studentId: string,
): Promise<{ inviteUrl: string; expiresAt: string }> =>
  apiRequest(`/api/students/${studentId}/invitations`, {
    method: "POST",
    token: tutorToken,
    expectStatus: 201,
  });

export const extractInviteToken = (inviteUrl: string): string => {
  const match = inviteUrl.match(/\/student-invite\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Cannot extract invite token from URL: ${inviteUrl}`);
  }
  return match[1];
};
