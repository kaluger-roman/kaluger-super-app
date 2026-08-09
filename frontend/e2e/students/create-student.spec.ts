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

      await dialog.getByLabel("Имя ученика").fill("Тест Тестов");
      await dialog.getByLabel("Ставка").fill("2000");

      await dialog.getByRole("button", { name: "Добавить" }).click();

      await expect(dialog).not.toBeVisible();
      await expect(page.getByText("Тест Тестов")).toBeVisible();

      const { students } = await getStudentsFor(tutor.userId);
      expect(students.some((s) => s.name === "Тест Тестов")).toBe(true);
    });

    test("учитель выбирает способ связи MAX для ученика и родителя и видит MAX в карточке", async ({
      page,
      tutor,
    }) => {
      await page.goto("/students");
      await expect(page.getByRole("tab", { name: "Активные" })).toBeVisible();

      await page.getByRole("button", { name: "Добавить ученика" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog.getByLabel("Имя ученика").fill("Макс Максимов");
      await dialog
        .getByRole("combobox", { name: "Способ связи", exact: true })
        .click();
      await page.getByRole("option", { name: "MAX" }).click();

      await dialog.getByLabel("Имя родителя").fill("Мама Максимова");
      await dialog.getByLabel("Телефон родителя").fill("+79990001122");
      await dialog
        .getByRole("combobox", { name: "Способ связи (родители)" })
        .click();
      await page.getByRole("option", { name: "MAX" }).click();

      await dialog.getByRole("button", { name: "Добавить" }).click();
      await expect(dialog).not.toBeVisible();

      await expect(page.getByText("Макс Максимов")).toBeVisible();
      await expect(page.getByText("MAX", { exact: true })).toBeVisible();

      await page.getByText("Подробности").click();
      await expect(page.getByText(/\(MAX\)/)).toBeVisible();

      const { students } = await getStudentsFor(tutor.userId);
      expect(students.some((s) => s.name === "Макс Максимов")).toBe(true);
    });
  },
);
