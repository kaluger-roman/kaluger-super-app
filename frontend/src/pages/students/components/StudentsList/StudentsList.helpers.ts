import type { Student } from "@shared";

export const groupStudentsByGrade = (students: Student[]): Record<string, Student[]> => {
  return students.reduce<Record<string, Student[]>>((acc, student) => {
    const grade = student.grade ? `${student.grade} класс` : "Без класса";
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(student);
    return acc;
  }, {});
};

export const sortGrades = (
  studentsByGrade: Record<string, Student[]>
): Array<[string, Student[]]> => {
  return Object.entries(studentsByGrade).sort((a, b) => {
    if (a[0] === "Без класса") return 1;
    if (b[0] === "Без класса") return -1;
    return parseInt(a[0]) - parseInt(b[0]);
  });
};
