import { test, expect } from "../fixtures";
import { createStudentFor } from "../helpers/db";

test.describe(
  "Редактирование ученика",
  { tag: ["@regression", "@students"] },
  () => {
    test("учитель меняет имя и ставку — обновлённые данные видны в списке без перезагрузки", async ({
      page,
      tutor,
    }) => {
      await createStudentFor(tutor.userId, {
        name: "Иван Старый",
        hourlyRate: 1500,
      });

      await page.goto("/students");
      await expect(page.getByRole("tab", { name: "Активные" })).toBeVisible();

      await page.getByText("Иван Старый").click();

      const viewDialog = page.getByRole("dialog");
      await expect(viewDialog).toBeVisible();

      await viewDialog.getByRole("button", { name: "Редактировать" }).click();

      const editDialog = page.getByRole("dialog");
      await expect(editDialog).toBeVisible();

      await editDialog.getByLabel("Имя студента").clear();
      await editDialog.getByLabel("Имя студента").fill("Иван Новый");
      await editDialog.getByLabel("Ставка").clear();
      await editDialog.getByLabel("Ставка").fill("2500");

      await editDialog.getByRole("button", { name: "Сохранить" }).click();

      await expect(editDialog).not.toBeVisible();
      await expect(page.getByText("Иван Новый")).toBeVisible();
      await expect(page.getByText("Иван Старый")).not.toBeVisible();
    });
  },
);
