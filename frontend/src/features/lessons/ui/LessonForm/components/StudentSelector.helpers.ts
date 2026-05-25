import type { Student } from "@shared";

// MUI Autocomplete не дедуплицирует options и Effector $students может временно
// содержать дубли (гонка addStudentFx с WS-обновлением, повторный fire ивента).
// Без явного дедупа ученик отображается в выпадашке дважды.
export const dedupeStudents = (options: Student[]): Student[] => {
  const seen = new Set<string>();
  const result: Student[] = [];
  for (const student of options) {
    if (seen.has(student.id)) continue;
    seen.add(student.id);
    result.push(student);
  }
  return result;
};

export const filterStudents = (options: Student[], inputValue: string): Student[] => {
  const query = inputValue.trim().toLowerCase();
  if (!query) return options;
  return options.filter((student) => student.name.toLowerCase().includes(query));
};

export const getStudentLabel = (student: Student): string => student.name;

export const isSameStudent = (a: Student, b: Student): boolean => a.id === b.id;
