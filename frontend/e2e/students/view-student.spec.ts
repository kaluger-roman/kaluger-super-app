import { test, expect } from "../fixtures";
import { createStudentFor } from "../helpers/db";

test.describe(
  "Просмотр карточки ученика",
  { tag: ["@regression", "@students"] },
  () => {
    test("учитель открывает карточку и видит все заполненные поля, затем закрывает диалог", async ({
      page,
      tutor,
    }) => {
      await createStudentFor(tutor.userId, {
        name: "Ученик Просмотра",
        hourlyRate: 1500,
        grade: 10,
        phone: "+79991234567",
        notes: "Тестовая заметка",
      });

      await page.goto("/students");
      await expect(page.getByRole("tab", { name: "Активные" })).toBeVisible();

      await page.getByText("Ученик Просмотра").click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await expect(dialog.getByText(/Ученик Просмотра/)).toBeVisible();
      await expect(dialog.getByText(/10 класс/)).toBeVisible();
      await expect(dialog.getByText(/1500/)).toBeVisible();
      await expect(dialog.getByText(/\+79991234567/)).toBeVisible();
      await expect(dialog.getByText("Тестовая заметка")).toBeVisible();

      await dialog.getByRole("button", { name: "Закрыть" }).click();
      await expect(dialog).not.toBeVisible();
    });
  },
);
