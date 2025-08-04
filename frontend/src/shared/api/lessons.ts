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

  getUpcoming: async (): Promise<Lesson[]> => {
    const response = await api.get("/lessons/upcoming");
    return response.data.lessons;
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
