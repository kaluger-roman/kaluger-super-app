import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, getLessonsFor } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * HOUR_MS;

test.describe(
  "Удаление серии регулярных уроков",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель удаляет повторяющийся урок со всеми будущими повторами серии", async ({
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
      // Чекбокс «удалить все повторы» живёт в LessonDeleteDialog, который
      // открывается из контекстного меню карточки урока (не из view-диалога).
      await page.getByRole("button", { name: "Меню урока" }).first().click();
      await page.getByRole("menuitem", { name: "Удалить" }).click();

      const deleteDialog = page.getByRole("dialog", { name: "Удалить урок" });
      await deleteDialog
        .getByLabel("Удалить все запланированные повторы этого урока")
        .check();
      await deleteDialog.getByRole("button", { name: "Удалить" }).click();

      await expect
        .poll(async () => {
          const { lessons } = await getLessonsFor(tutor.userId);
          return lessons.length;
        })
        .toBe(0);
    });
  },
);
