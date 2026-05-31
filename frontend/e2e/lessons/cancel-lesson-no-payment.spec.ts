import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, getLessonsFor } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;

test.describe(
  "Отмена неоплаченного урока",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель отменяет неоплаченный урок — он переходит в статус CANCELLED без переноса оплаты", async ({
      page,
      tutor,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Олег Орлов",
        hourlyRate: 1500,
      });

      const start = new Date();
      start.setDate(start.getDate() + 2);
      start.setHours(12, 0, 0, 0);
      const { lesson } = await createLesson({
        tutorId: tutor.userId,
        studentId: student.id,
        startTime: start,
        endTime: new Date(start.getTime() + HOUR_MS),
        price: 1500,
        status: "SCHEDULED",
        isPaid: false,
      });

      await page.goto("/lessons");
      await page.getByRole("heading", { name: /Олег Орлов/ }).first().click();

      const viewDialog = page.getByRole("dialog").first();
      await viewDialog.getByRole("button", { name: "Отменить" }).click();

      const confirmDialog = page.getByRole("dialog", { name: "Отменить урок" });
      await expect(confirmDialog).toBeVisible();
      await confirmDialog.getByRole("button", { name: "Подтвердить" }).click();

      await expect
        .poll(async () => {
          const { lessons } = await getLessonsFor(tutor.userId);
          const updated = lessons.find((l) => l.id === lesson.id);
          return { status: updated?.status, isPaid: updated?.isPaid };
        })
        .toEqual({ status: "CANCELLED", isPaid: false });
    });
  },
);
