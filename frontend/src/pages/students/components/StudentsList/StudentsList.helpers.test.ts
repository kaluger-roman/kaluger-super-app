import { describe, it, expect } from "vitest";

import type { Student } from "@shared";

import { groupStudentsByGrade, sortGrades } from "./StudentsList.helpers";

const createMockStudent = (id: string, name: string, grade: number | null): Student => ({
  id,
  name,
  grade,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
});

describe("StudentsList.helpers", () => {
  describe("groupStudentsByGrade", () => {
    it("should group students by grade correctly", () => {
      const students: Student[] = [
        createMockStudent("1", "Иван", 9),
        createMockStudent("2", "Петр", 9),
        createMockStudent("3", "Мария", 11),
      ];

      const grouped = groupStudentsByGrade(students);

      expect(grouped).toEqual({
        "9 класс": [students[0], students[1]],
        "11 класс": [students[2]],
      });
    });

    it("should group students without grade as 'Без класса'", () => {
      const students: Student[] = [
        createMockStudent("1", "Иван", 9),
        createMockStudent("2", "Петр", null),
      ];

      const grouped = groupStudentsByGrade(students);

      expect(grouped).toEqual({
        "9 класс": [students[0]],
        "Без класса": [students[1]],
      });
    });

    it("should handle empty array", () => {
      const grouped = groupStudentsByGrade([]);
      expect(grouped).toEqual({});
    });

    it("should handle all students without grade", () => {
      const students: Student[] = [
        createMockStudent("1", "Иван", null),
        createMockStudent("2", "Петр", null),
      ];

      const grouped = groupStudentsByGrade(students);

      expect(grouped).toEqual({
        "Без класса": [students[0], students[1]],
      });
    });

    it("should preserve student order within grade", () => {
      const students: Student[] = [
        createMockStudent("1", "Иван", 9),
        createMockStudent("2", "Петр", 9),
        createMockStudent("3", "Мария", 9),
      ];

      const grouped = groupStudentsByGrade(students);

      expect(grouped["9 класс"]).toEqual([students[0], students[1], students[2]]);
    });
  });

  describe("sortGrades", () => {
    it("should sort grades in ascending order", () => {
      const studentsByGrade = {
        "11 класс": [],
        "5 класс": [],
        "9 класс": [],
      };

      const sorted = sortGrades(studentsByGrade);

      expect(sorted.map(([grade]) => grade)).toEqual(["5 класс", "9 класс", "11 класс"]);
    });

    it("should place 'Без класса' at the end", () => {
      const studentsByGrade = {
        "Без класса": [],
        "9 класс": [],
        "11 класс": [],
      };

      const sorted = sortGrades(studentsByGrade);

      expect(sorted.map(([grade]) => grade)).toEqual(["9 класс", "11 класс", "Без класса"]);
    });

    it("should handle only 'Без класса' group", () => {
      const studentsByGrade = {
        "Без класса": [],
      };

      const sorted = sortGrades(studentsByGrade);

      expect(sorted.map(([grade]) => grade)).toEqual(["Без класса"]);
    });

    it("should preserve students array in sorted result", () => {
      const students1 = [createMockStudent("1", "Иван", 9)];
      const students2 = [createMockStudent("2", "Петр", 11)];

      const studentsByGrade = {
        "11 класс": students2,
        "9 класс": students1,
      };

      const sorted = sortGrades(studentsByGrade);

      expect(sorted).toEqual([
        ["9 класс", students1],
        ["11 класс", students2],
      ]);
    });

    it("should handle empty object", () => {
      const sorted = sortGrades({});
      expect(sorted).toEqual([]);
    });

    it("should correctly parse grade numbers", () => {
      const studentsByGrade = {
        "1 класс": [],
        "10 класс": [],
        "2 класс": [],
      };

      const sorted = sortGrades(studentsByGrade);

      // Should sort numerically, not alphabetically
      expect(sorted.map(([grade]) => grade)).toEqual(["1 класс", "2 класс", "10 класс"]);
    });
  });
});
