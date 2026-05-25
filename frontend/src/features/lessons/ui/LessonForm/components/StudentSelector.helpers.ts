import type { Student } from "@shared";

export const filterStudents = (options: Student[], inputValue: string): Student[] => {
  const query = inputValue.trim().toLowerCase();
  if (!query) return options;
  return options.filter((student) => student.name.toLowerCase().includes(query));
};

export const getStudentLabel = (student: Student): string => student.name;

export const isSameStudent = (a: Student, b: Student): boolean => a.id === b.id;
