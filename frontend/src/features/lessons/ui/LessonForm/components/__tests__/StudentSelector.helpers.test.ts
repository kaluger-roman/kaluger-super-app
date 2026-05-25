import { describe, expect, it } from "vitest";

import type { Student } from "@shared";

import {
  filterStudents,
  getStudentLabel,
  isSameStudent,
} from "../StudentSelector.helpers";

const makeStudent = (over: Partial<Student> = {}): Student => ({
  id: "s-1",
  name: "Иван Иванов",
  phone: "+79991234567",
  contactMethod: "WHATSAPP",
  archived: false,
  hourlyRate: 2000,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("filterStudents", () => {
  const students = [
    makeStudent({ id: "s-1", name: "Иван Иванов" }),
    makeStudent({ id: "s-2", name: "Пётр Петров" }),
    makeStudent({ id: "s-3", name: "Маша Сидорова" }),
  ];

  it("should return all options when query is empty", () => {
    expect(filterStudents(students, "")).toEqual(students);
  });

  it("should filter case-insensitively by substring of name", () => {
    expect(filterStudents(students, "пет")).toEqual([students[1]]);
    expect(filterStudents(students, "ИВА")).toEqual([students[0]]);
  });

  it("should trim whitespace from the query", () => {
    expect(filterStudents(students, "  маша  ")).toEqual([students[2]]);
  });

  it("should return empty when nothing matches", () => {
    expect(filterStudents(students, "xyz")).toEqual([]);
  });
});

describe("getStudentLabel", () => {
  it("should return the student name", () => {
    expect(getStudentLabel(makeStudent({ name: "Алиса" }))).toBe("Алиса");
  });
});

describe("isSameStudent", () => {
  it("should compare by id", () => {
    expect(
      isSameStudent(
        makeStudent({ id: "s-1", name: "А" }),
        makeStudent({ id: "s-1", name: "Б" }),
      ),
    ).toBe(true);
    expect(
      isSameStudent(makeStudent({ id: "s-1" }), makeStudent({ id: "s-2" })),
    ).toBe(false);
  });
});
