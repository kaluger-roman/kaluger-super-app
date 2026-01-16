import { api } from "./base";
import type { Student, CreateStudentDto, UpdateStudentDto, ArchiveReason } from "../types";

export const studentsApi = {
  getAll: async (archived = false): Promise<Student[]> => {
    const response = await api.get("/students", {
      params: { archived: archived.toString() },
    });
    return response.data.students;
  },

  getById: async (id: string): Promise<Student> => {
    const response = await api.get(`/students/${id}`);
    return response.data.student;
  },

  create: async (studentData: CreateStudentDto): Promise<Student> => {
    const response = await api.post("/students", studentData);
    return response.data.student;
  },

  update: async (id: string, studentData: UpdateStudentDto): Promise<Student> => {
    const response = await api.put(`/students/${id}`, studentData);
    return response.data.student;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },

  archive: async (
    id: string,
    data?: { archiveReason?: ArchiveReason; archiveComment?: string }
  ): Promise<Student> => {
    const response = await api.put(`/students/${id}/archive`, data);
    return response.data.student;
  },

  unarchive: async (id: string): Promise<Student> => {
    const response = await api.put(`/students/${id}/unarchive`);
    return response.data.student;
  },
};
