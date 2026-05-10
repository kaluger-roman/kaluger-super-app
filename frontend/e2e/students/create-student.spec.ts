import { test, expect } from "../fixtures";
import { getStudentsFor } from "../helpers/db";

test.describe(
  "Создание ученика",
  { tag: ["@regression", "@students"] },
  () => {
    test("учитель заполняет форму через FAB и новый ученик появляется в списке", async ({
      page,
      tutor,
    }) => {
      await page.goto("/students");
      await expect(page.getByRole("tab", { name: "Активные" })).toBeVisible();

      await page.getByRole("button", { name: "Добавить ученика" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByLabel("Имя студента").fill("Тест Тестов");
      await dialog.getByLabel("Ставка").fill("2000");

      await dialog.getByRole("button", { name: "Добавить" }).click();

      await expect(dialog).not.toBeVisible();
      await expect(page.getByText("Тест Тестов")).toBeVisible();

      const { students } = await getStudentsFor(tutor.userId);
      expect(students.some((s) => s.name === "Тест Тестов")).toBe(true);
    });
  },
);
