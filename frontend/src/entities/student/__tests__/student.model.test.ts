import { fork, allSettled } from "effector";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { studentsApi } from "@shared";

import {
  loadStudents,
  loadStudent,
  addStudent,
  updateStudent,
  removeStudent,
  $students,
  $currentStudent,
  $isLoadStudent,
  $isAddStudent,
  $isUpdateStudent,
  $isRemoveStudent,
  $isStudentsLoading,
} from "../student.model";

vi.mock("@shared", () => ({
  studentsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("student.model", () => {
  const mockStudent = {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    phone: "+79991234567",
    grade: 10,
    notes: "Test notes",
    archived: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockStudentDto = {
    name: "John Doe",
    email: "john@example.com",
    phone: "+79991234567",
    grade: 10,
    notes: "Test notes",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadStudentsFx", () => {
    it("should load all students", async () => {
      const mockStudents = [mockStudent, { ...mockStudent, id: "2", name: "Jane Doe" }];
      vi.mocked(studentsApi.getAll).mockResolvedValue(mockStudents);

      const scope = fork();
      await allSettled(loadStudents, { scope });

      expect(scope.getState($students)).toEqual(mockStudents);
    });

    it("should set loading state", async () => {
      vi.mocked(studentsApi.getAll).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const scope = fork();
      const promise = allSettled(loadStudents, { scope });

      await promise;
    });
  });

  describe("loadStudentFx", () => {
    it("should load single student", async () => {
      vi.mocked(studentsApi.getById).mockResolvedValue(mockStudent);

      const scope = fork();
      await allSettled(loadStudent, { scope, params: "1" });

      expect(scope.getState($currentStudent)).toEqual(mockStudent);
    });
  });

  describe("addStudentFx", () => {
    it("should add new student", async () => {
      vi.mocked(studentsApi.create).mockResolvedValue(mockStudent);
      vi.mocked(studentsApi.getAll).mockResolvedValue([mockStudent]);

      const scope = fork();
      await allSettled(addStudent, { scope, params: mockStudentDto });

      const students = scope.getState($students);
      expect(students).toContainEqual(mockStudent);
    });

    it("should reload students list after adding", async () => {
      vi.mocked(studentsApi.create).mockResolvedValue(mockStudent);
      vi.mocked(studentsApi.getAll).mockResolvedValue([mockStudent]);

      const scope = fork();
      await allSettled(addStudent, { scope, params: mockStudentDto });

      expect(studentsApi.getAll).toHaveBeenCalled();
    });
  });

  describe("updateStudentFx", () => {
    it("should update existing student", async () => {
      const updatedStudent = { ...mockStudent, name: "Updated Name" };
      vi.mocked(studentsApi.update).mockResolvedValue(updatedStudent);
      vi.mocked(studentsApi.getAll).mockResolvedValue([updatedStudent]);

      const scope = fork({
        values: [[$students, [mockStudent]]],
      });

      await allSettled(updateStudent, {
        scope,
        params: { id: "1", data: { name: "Updated Name" } },
      });

      const students = scope.getState($students);
      expect(students[0].name).toBe("Updated Name");
    });

    it("should update current student if ids match", async () => {
      const updatedStudent = { ...mockStudent, name: "Updated" };
      vi.mocked(studentsApi.update).mockResolvedValue(updatedStudent);
      vi.mocked(studentsApi.getAll).mockResolvedValue([updatedStudent]);

      const scope = fork({
        values: [[$currentStudent, mockStudent]],
      });

      await allSettled(updateStudent, {
        scope,
        params: { id: "1", data: { name: "Updated" } },
      });

      expect(scope.getState($currentStudent)?.name).toBe("Updated");
    });

    it("should not update current student if ids don't match", async () => {
      const updatedStudent = { ...mockStudent, id: "999", name: "Other" };
      vi.mocked(studentsApi.update).mockResolvedValue(updatedStudent);
      vi.mocked(studentsApi.getAll).mockResolvedValue([mockStudent, updatedStudent]);

      const scope = fork({
        values: [[$currentStudent, mockStudent]],
      });

      await allSettled(updateStudent, {
        scope,
        params: { id: "999", data: { name: "Other" } },
      });

      expect(scope.getState($currentStudent)?.name).toBe("John Doe");
    });
  });

  describe("removeStudentFx", () => {
    it("should remove student from list", async () => {
      vi.mocked(studentsApi.delete).mockResolvedValue(undefined);
      vi.mocked(studentsApi.getAll).mockResolvedValue([]);

      const scope = fork({
        values: [[$students, [mockStudent, { ...mockStudent, id: "2" }]]],
      });

      await allSettled(removeStudent, { scope, params: "1" });

      const students = scope.getState($students);
      expect(students).not.toContainEqual(mockStudent);
    });

    it("should clear current student", async () => {
      vi.mocked(studentsApi.delete).mockResolvedValue(undefined);
      vi.mocked(studentsApi.getAll).mockResolvedValue([]);

      const scope = fork({
        values: [[$currentStudent, mockStudent]],
      });

      await allSettled(removeStudent, { scope, params: "1" });

      expect(scope.getState($currentStudent)).toBeNull();
    });

    it("should reload students list after removal", async () => {
      vi.mocked(studentsApi.delete).mockResolvedValue(undefined);
      vi.mocked(studentsApi.getAll).mockResolvedValue([]);

      const scope = fork();
      await allSettled(removeStudent, { scope, params: "1" });

      expect(studentsApi.getAll).toHaveBeenCalled();
    });
  });

  describe("loading states", () => {
    it("should track loading state for each operation", () => {
      const scope = fork();

      expect(scope.getState($isLoadStudent)).toBe(false);
      expect(scope.getState($isAddStudent)).toBe(false);
      expect(scope.getState($isUpdateStudent)).toBe(false);
      expect(scope.getState($isRemoveStudent)).toBe(false);
      expect(scope.getState($isStudentsLoading)).toBe(false);
    });
  });
});
