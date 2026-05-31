import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, getLessonsFor } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * HOUR_MS;

test.describe(
  "Изменение цены серии регулярных уроков",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель меняет цену регулярного урока — новая цена применяется ко всей серии", async ({
      page,
      tutor,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Олег Орлов",
        hourlyRate: 1500,
      });

      const baseStart = new Date();
      baseStart.setDate(baseStart.getDate() + 7);
      baseStart.setHours(14, 0, 0, 0);

      for (let i = 0; i < 3; i++) {
        const start = new Date(baseStart.getTime() + i * WEEK_MS);
        await createLesson({
          tutorId: tutor.userId,
          studentId: student.id,
          startTime: start,
          endTime: new Date(start.getTime() + HOUR_MS),
          price: 1500,
          status: "SCHEDULED",
          isRecurring: true,
        });
      }

      await page.goto("/lessons");
      await page.getByRole("heading", { name: /Олег Орлов/ }).first().click();

      const viewDialog = page.getByRole("dialog").first();
      await viewDialog.getByRole("button", { name: "Редактировать" }).click();

      const formDialog = page.getByRole("dialog").last();
      await formDialog.getByLabel("Стоимость урока (₽)").fill("2000");
      await formDialog.getByRole("button", { name: "Обновить урок" }).click();

      const confirmDialog = page.getByRole("dialog").last();
      await expect(
        confirmDialog.getByText("Изменение цены регулярного урока"),
      ).toBeVisible();
      await confirmDialog.getByRole("button", { name: "Подтвердить" }).click();

      await expect
        .poll(async () => {
          const { lessons } = await getLessonsFor(tutor.userId);
          return lessons.map((l) => Number(l.price)).sort();
        })
        .toEqual([2000, 2000, 2000]);
    });
  },
);
