import { api } from "./base";
import { Lesson, CreateLessonDto, UpdateLessonDto, Statistics } from "../types";

type LessonsResponse = {
  lessons: Lesson[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type LessonsFilters = {
  startDate?: string;
  endDate?: string;
  studentId?: string;
  status?: string;
  page?: number;
  limit?: number;
  onlyUnpaid?: boolean;
  onlyWithoutHomework?: boolean;
};

export const lessonsApi = {
  getAll: async (filters?: LessonsFilters): Promise<LessonsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/lessons?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Lesson> => {
    const response = await api.get(`/lessons/${id}`);
    return response.data.lesson;
  },

  getUpcoming: async (filters?: {
    page?: number;
    limit?: number;
    onlyUnpaid?: boolean;
    onlyWithoutHomework?: boolean;
  }): Promise<LessonsResponse> => {
    const params = new URLSearchParams();

    // Для предстоящих уроков используем специальную логику:
    // 1. IN_PROGRESS уроки (независимо от времени)
    // 2. SCHEDULED/RESCHEDULED уроки с startTime >= сейчас
    const now = new Date().toISOString();

    // Отправляем только статусы, остальная логика будет в backend
    params.append("upcoming", "true");
    params.append("currentTime", now);

    if (filters?.onlyUnpaid)
      params.append("onlyUnpaid", String(filters.onlyUnpaid));
    if (filters?.onlyWithoutHomework)
      params.append("onlyWithoutHomework", String(filters.onlyWithoutHomework));

    if (filters?.page) {
      params.append("page", filters.page.toString());
    }
    if (filters?.limit) {
      params.append("limit", filters.limit.toString());
    }

    const response = await api.get(`/lessons?${params.toString()}`);
    return response.data;
  },

  getByWeek: async (filters: {
    weekStart: string;
    onlyUnpaid?: boolean;
    onlyWithoutHomework?: boolean;
  }): Promise<LessonsResponse> => {
    const params = new URLSearchParams();

    params.append("weekStart", filters.weekStart);
    params.append("weekly", "true");
    if (filters.onlyUnpaid)
      params.append("onlyUnpaid", String(filters.onlyUnpaid));
    if (filters.onlyWithoutHomework)
      params.append("onlyWithoutHomework", String(filters.onlyWithoutHomework));

    const response = await api.get(`/lessons?${params.toString()}`);
    return response.data;
  },

  getStatistics: async (filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Statistics> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/lessons/statistics?${params.toString()}`);
    return response.data;
  },

  create: async (lessonData: CreateLessonDto): Promise<Lesson> => {
    const response = await api.post("/lessons", lessonData);
    return response.data.lesson;
  },

  update: async (id: string, lessonData: UpdateLessonDto): Promise<Lesson> => {
    const response = await api.put(`/lessons/${id}`, lessonData);
    return response.data.lesson;
  },

  delete: async (id: string, deleteAllFuture?: boolean): Promise<void> => {
    await api.delete(`/lessons/${id}`, {
      data: { deleteAllFuture },
    });
  },
};
