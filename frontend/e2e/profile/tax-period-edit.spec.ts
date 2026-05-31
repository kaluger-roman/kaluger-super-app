import { test, expect } from "../fixtures";
import { setTaxPeriodsFor } from "../helpers/db";

test.describe(
  "Редактирование налоговых периодов",
  { tag: ["@regression", "@profile"] },
  () => {
    test("учитель меняет ставку одного периода и удаляет другой — изменения сохраняются", async ({
      page,
      tutor,
    }) => {
      await setTaxPeriodsFor(
        tutor.userId,
        [
          { startDate: "2024-01-01", rate: 4 },
          { startDate: "2025-01-01", rate: 6 },
        ],
        true,
      );

      await page.goto("/profile");
      await page.getByRole("tab", { name: "Финансы" }).click({ timeout: 15_000 });

      await page.getByRole("button", { name: "Настроить ставки" }).click();
      const dialog = page.getByRole("dialog", { name: "Налоговые ставки" });
      await expect(dialog).toBeVisible();

      // Меняем ставку первого периода 4 → 5.
      await dialog.getByLabel("Ставка %").nth(0).fill("5");
      // Удаляем второй период (6%).
      await dialog.getByRole("button", { name: "Удалить период" }).nth(1).click();

      await dialog.getByRole("button", { name: "Сохранить" }).click();
      await expect(dialog).not.toBeVisible();

      await expect(page.getByText(/5%/)).toBeVisible();
      await expect(page.getByText(/6%/)).toHaveCount(0);
    });
  },
);
