import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, getLessonsFor } from "../helpers/db";
import { fillDateTimePicker } from "../helpers/datepicker";

const HOUR_MS = 60 * 60 * 1000;
const pad2 = (v: number): string => v.toString().padStart(2, "0");
const ddmmyyyy = (d: Date): string =>
  `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}`;

test.describe(
  "Конфликт расписания при создании урока",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель пытается создать урок в занятый слот и видит ошибку конфликта", async ({
      page,
      tutor,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Олег Орлов",
        hourlyRate: 1500,
      });

      const occupied = new Date();
      occupied.setDate(occupied.getDate() + 3);
      occupied.setHours(14, 0, 0, 0);
      await createLesson({
        tutorId: tutor.userId,
        studentId: student.id,
        startTime: occupied,
        endTime: new Date(occupied.getTime() + HOUR_MS),
        price: 1500,
        status: "SCHEDULED",
      });

      await page.goto("/lessons");
      await page.getByRole("button", { name: "Создать урок" }).click();

      const dialog = page.getByRole("dialog");
      await dialog.getByRole("combobox", { name: /Ученик/ }).click();
      await page.getByRole("option", { name: /Олег Орлов/ }).click();

      // Тот же слот, что и у существующего урока → пересечение.
      await fillDateTimePicker(
        page,
        "Время начала",
        `${ddmmyyyy(occupied)}1400`,
      );

      await dialog.getByRole("button", { name: "Создать урок" }).click();

      await expect(page.getByText(/конфликтует/i)).toBeVisible();

      // Урок не создан — в БД остаётся только исходный.
      const { lessons } = await getLessonsFor(tutor.userId);
      expect(lessons.length).toBe(1);
    });
  },
);
