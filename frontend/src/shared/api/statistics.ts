import { Statistics } from "../types";
import { api } from "./base";
import type { LessonsBySubject, LessonsByType, StudentStatistics } from "./statistics.types";

export type { LessonsBySubject, LessonsByType, StudentStatistics };

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
    api.get<{ studentStatistics: StudentStatistics }>("/statistics/by-student", { params }),
};
