import { api } from "./base";

export type Statistics = {
  completedLessons: number;
  cancelledLessons: number;
  upcomingLessons: number;
  totalLessons: number;
  earnings: number;
  lastMonthEarnings: number;
  lostEarnings: number;
};

export type LessonsBySubject = {
  subject: string;
  _count: { id: number };
  _sum: { price: number | null };
}[];

export type LessonsByType = {
  lessonType: string;
  _count: { id: number };
  _sum: { price: number | null };
}[];

export type StudentStatistics = {
  studentId: string;
  _count: { id: number };
  _sum: { price: number | null };
  student:
    | {
        id: string;
        name: string;
      }
    | undefined;
}[];

export const statisticsApi = {
  // Основная статистика
  getStatistics: (params?: { startDate?: string; endDate?: string }) =>
    api.get<Statistics>("/statistics", { params }),

  // Статистика по предметам
  getLessonsBySubject: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{ lessonsBySubject: LessonsBySubject }>("/statistics/by-subject", {
      params,
    }),

  // Статистика по типам уроков
  getLessonsByType: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{ lessonsByType: LessonsByType }>("/statistics/by-type", {
      params,
    }),

  // Статистика по ученикам
  getStudentStatistics: (params?: { startDate?: string; endDate?: string }) =>
    api.get<{ studentStatistics: StudentStatistics }>(
      "/statistics/by-student",
      { params }
    ),
};
