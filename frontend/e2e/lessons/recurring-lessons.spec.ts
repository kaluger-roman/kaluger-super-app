import { test, expect } from "../fixtures";
import { createStudentFor, getLessonsFor } from "../helpers/db";

test.describe(
  "Создание регулярных уроков",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель создаёт регулярный урок и в БД появляется серия на 3 месяца", async ({
      page,
      tutor,
    }) => {
      await createStudentFor(tutor.userId, {
        name: "Анна Алексеева",
        hourlyRate: 1500,
      });

      await page.goto("/lessons");

      await page.getByRole("button", { name: "Создать урок" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Создать новый урок")).toBeVisible();

      await dialog.getByRole("combobox", { name: /Ученик/ }).click();
      await page.getByRole("option", { name: /Анна Алексеева/ }).click();

      await dialog.getByLabel(/Регулярное занятие/).check();

      await dialog.getByRole("button", { name: "Создать урок" }).click();

      await expect(dialog).toBeHidden();

      await expect
        .poll(async () => {
          const { lessons } = await getLessonsFor(tutor.userId);
          return lessons.length;
        })
        .toBeGreaterThanOrEqual(10);

      await expect(
        page.getByRole("heading", { name: /Анна Алексеева/ }).first(),
      ).toBeVisible();
    });
  },
);
