import { api } from "./base";
import { Student, CreateStudentDto, UpdateStudentDto } from "../types";

export const studentsApi = {
  getAll: async (): Promise<Student[]> => {
    const response = await api.get("/students");
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

  update: async (
    id: string,
    studentData: UpdateStudentDto
  ): Promise<Student> => {
    const response = await api.put(`/students/${id}`, studentData);
    return response.data.student;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },
};
