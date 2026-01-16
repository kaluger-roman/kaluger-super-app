import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Student, CreateStudentDto } from "../../types";
import { api } from "../base";
import { studentsApi } from "../students";

vi.mock("../base", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("studentsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should fetch all students", async () => {
      const mockStudents: Student[] = [
        {
          id: "1",
          name: "John Doe",
          phone: "+79991234567",
          grade: 10,
          notes: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          archived: false,
        },
      ];
      const mockResponse = { data: { students: mockStudents } };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await studentsApi.getAll();

      expect(api.get).toHaveBeenCalledWith("/students", { params: { archived: "false" } });
      expect(result).toEqual(mockStudents);
    });
  });

  describe("getById", () => {
    it("should fetch student by id", async () => {
      const mockStudent: Student = {
        id: "1",
        name: "John Doe",
        phone: "+79991234567",
        grade: 10,
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Student;
      const mockResponse = { data: { student: mockStudent } };

      vi.mocked(api.get).mockResolvedValue(mockResponse);

      // eslint-disable-next-line testing-library/no-await-sync-query
      const result = await studentsApi.getById("1");

      expect(api.get).toHaveBeenCalledWith("/students/1");
      expect(result).toEqual(mockStudent);
    });
  });

  describe("create", () => {
    it("should create new student", async () => {
      const studentData: CreateStudentDto = {
        name: "Jane Doe",
        phone: "+79991234567",
        grade: 9,
        notes: "New student",
      };
      const mockStudent: Student = {
        id: "2",
        ...studentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Student;
      const mockResponse = { data: { student: mockStudent } };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await studentsApi.create(studentData);

      expect(api.post).toHaveBeenCalledWith("/students", studentData);
      expect(result).toEqual(mockStudent);
    });
  });

  describe("update", () => {
    it("should update student", async () => {
      const studentData: Partial<CreateStudentDto> = {
        name: "John Updated",
        grade: 11,
      };
      const mockStudent: Student = {
        id: "1",
        name: "John Updated",
        phone: "+79991234567",
        grade: 11,
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Student;
      const mockResponse = { data: { student: mockStudent } };

      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await studentsApi.update("1", studentData);

      expect(api.put).toHaveBeenCalledWith("/students/1", studentData);
      expect(result).toEqual(mockStudent);
    });
  });

  describe("delete", () => {
    it("should delete student", async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: {} });

      await studentsApi.delete("1");

      expect(api.delete).toHaveBeenCalledWith("/students/1");
    });
  });
  describe("archive", () => {
    it("should archive student without reason and comment", async () => {
      const mockStudent: Student = {
        id: "1",
        name: "John Doe",
        archived: true,
        archivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Student;
      const mockResponse = { data: { student: mockStudent } };

      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await studentsApi.archive("1");

      expect(api.put).toHaveBeenCalledWith("/students/1/archive", undefined);
      expect(result).toEqual(mockStudent);
    });

    it("should archive student with reason and comment", async () => {
      const mockStudent: Student = {
        id: "1",
        name: "John Doe",
        archived: true,
        archivedAt: new Date().toISOString(),
        archiveReason: "COMPLETED_STUDIES",
        archiveComment: "Test comment",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Student;
      const mockResponse = { data: { student: mockStudent } };

      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await studentsApi.archive("1", {
        archiveReason: "COMPLETED_STUDIES",
        archiveComment: "Test comment",
      });

      expect(api.put).toHaveBeenCalledWith("/students/1/archive", {
        archiveReason: "COMPLETED_STUDIES",
        archiveComment: "Test comment",
      });
      expect(result).toEqual(mockStudent);
    });
  });

  describe("unarchive", () => {
    it("should unarchive student", async () => {
      const mockStudent: Student = {
        id: "1",
        name: "John Doe",
        archived: false,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Student;
      const mockResponse = { data: { student: mockStudent } };

      vi.mocked(api.put).mockResolvedValue(mockResponse);

      const result = await studentsApi.unarchive("1");

      expect(api.put).toHaveBeenCalledWith("/students/1/unarchive");
      expect(result).toEqual(mockStudent);
    });
  });
});
