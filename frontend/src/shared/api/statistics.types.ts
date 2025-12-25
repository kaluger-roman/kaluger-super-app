export type LessonsBySubject = {
  subject: string;
  _count: { id: number };
  _sum: { price: number | null };
}[];

export type LessonsByType = {
  lessonType: string;
  _count: { id: number };
  _sum: { price: number | null };
}[];

export type StudentStatistics = {
  studentId: string;
  _count: { id: number };
  _sum: { price: number | null };
  student:
    | {
        id: string;
        name: string;
      }
    | undefined;
}[];
