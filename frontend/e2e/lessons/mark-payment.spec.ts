import { test, expect } from "../fixtures";
import {
  createLesson,
  createStudentFor,
  getLessonsFor,
} from "../helpers/db";

test.describe(
  "Отметка оплаты урока",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель переключает свитч оплаты на завершённом уроке и подтверждает дату", async ({
      page,
      tutor,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Мария Петрова",
        hourlyRate: 1500,
      });

      const yesterdayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = new Date(yesterdayStart.getTime() + 60 * 60 * 1000);

      await createLesson({
        tutorId: tutor.userId,
        studentId: student.id,
        startTime: yesterdayStart,
        endTime: yesterdayEnd,
        status: "COMPLETED",
        isPaid: false,
        price: 1500,
      });

      await page.goto("/lessons");

      await page.getByRole("tab", { name: "Прошедшие" }).click();

      await page.getByRole("heading", { name: /Мария Петрова/ }).first().click();

      const viewDialog = page.getByRole("dialog").first();
      await expect(viewDialog.getByText("Урок", { exact: true })).toBeVisible();

      const unpaidSwitch = viewDialog.getByLabel("Не оплачено");
      await expect(unpaidSwitch).toBeVisible();
      await unpaidSwitch.click();

      const confirmDialog = page.getByRole("dialog", {
        name: "Отметить как оплачено",
      });
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog.getByLabel("Дата оплаты")).toBeVisible();

      await confirmDialog.getByRole("button", { name: "Подтвердить" }).click();

      await expect(confirmDialog).toBeHidden();

      await expect(viewDialog.getByLabel("Оплачено")).toBeVisible();

      const { lessons } = await getLessonsFor(tutor.userId);
      expect(lessons[0]!.isPaid).toBe(true);
    });
  },
);
