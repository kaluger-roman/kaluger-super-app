import { test, expect } from "../fixtures";
import {
  createLesson,
  createStudentFor,
  getLessonsFor,
} from "../helpers/db";

test.describe(
  "Отмена урока с переносом оплаты",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель отменяет оплаченный урок и оплата переносится на следующий", async ({
      page,
      tutor,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Сергей Сидоров",
        hourlyRate: 1500,
      });

      const yesterdayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = new Date(yesterdayStart.getTime() + 60 * 60 * 1000);
      const tomorrowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 60 * 60 * 1000);

      const { lesson: lessonA } = await createLesson({
        tutorId: tutor.userId,
        studentId: student.id,
        startTime: yesterdayStart,
        endTime: yesterdayEnd,
        price: 1500,
        status: "COMPLETED",
        isPaid: true,
        paymentDate: new Date(),
      });

      const { lesson: lessonB } = await createLesson({
        tutorId: tutor.userId,
        studentId: student.id,
        startTime: tomorrowStart,
        endTime: tomorrowEnd,
        price: 1500,
        status: "SCHEDULED",
        isPaid: false,
      });

      await page.goto("/lessons");

      await page.getByRole("tab", { name: "Прошедшие" }).click();

      await page.getByRole("heading", { name: /Сергей Сидоров/ }).first().click();

      const viewDialog = page.getByRole("dialog").first();
      await expect(viewDialog.getByText("Урок", { exact: true })).toBeVisible();

      await viewDialog.getByRole("button", { name: "Отменить" }).click();

      const confirmDialog = page.getByRole("dialog", { name: "Отменить урок" });
      await expect(confirmDialog).toBeVisible();
      await confirmDialog.getByRole("button", { name: "Подтвердить" }).click();

      await expect.poll(async () => {
        const { lessons } = await getLessonsFor(tutor.userId);
        const a = lessons.find((l) => l.id === lessonA.id);
        const b = lessons.find((l) => l.id === lessonB.id);
        return { aIsPaid: a?.isPaid, bIsPaid: b?.isPaid };
      }).toEqual({ aIsPaid: false, bIsPaid: true });
    });
  },
);
