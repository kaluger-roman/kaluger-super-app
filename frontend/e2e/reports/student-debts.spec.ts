import { test, expect } from "../fixtures";
import { createStudentFor, createLesson } from "../helpers/db";
import { apiRequest } from "../helpers/api";

type StudentStatsResponse = {
  studentStatistics: Array<{
    studentId: string;
    _count: { id: number };
    _sum: { price: number | null };
    student?: { id: string; name: string };
  }>;
};

test.describe(
  "Задолженность учеников в отчёте",
  { tag: ["@regression", "@reports"] },
  () => {
    test("учитель видит суммарную задолженность и оба должника отражены в API", async ({
      page,
      tutor,
    }) => {
      const { userId, token } = tutor;
      const hourMs = 60 * 60 * 1000;
      const now = new Date();

      const { student: student1 } = await createStudentFor(userId, {
        name: "Должник Первый",
      });
      const { student: student2 } = await createStudentFor(userId, {
        name: "Должник Второй",
      });

      const start1 = new Date(now.getFullYear(), now.getMonth(), 2, 10, 0, 0);
      await createLesson({
        tutorId: userId,
        studentId: student1.id,
        startTime: start1.toISOString(),
        endTime: new Date(start1.getTime() + hourMs).toISOString(),
        price: 1500,
        status: "COMPLETED",
        isPaid: false,
      });

      const start2 = new Date(now.getFullYear(), now.getMonth(), 3, 10, 0, 0);
      await createLesson({
        tutorId: userId,
        studentId: student2.id,
        startTime: start2.toISOString(),
        endTime: new Date(start2.getTime() + hourMs).toISOString(),
        price: 2500,
        status: "COMPLETED",
        isPaid: false,
      });

      await page.goto("/reports");
      await expect(
        page.getByRole("heading", { name: "Задолженность" }),
      ).toBeVisible();

      await expect(page.getByText(/4\s*000/).first()).toBeVisible();

      const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString();
      const endDate = new Date().toISOString();
      const stats = await apiRequest<StudentStatsResponse>(
        `/api/statistics/by-student?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        { token },
      );
      const studentIds = stats.studentStatistics.map((s) => s.studentId);
      expect(studentIds).toContain(student1.id);
      expect(studentIds).toContain(student2.id);
    });
  },
);
