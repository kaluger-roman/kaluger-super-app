import { test, expect } from "../fixtures";

test.describe(
  "Настройка налоговых периодов",
  { tag: ["@regression", "@profile"] },
  () => {
    test("учитель добавляет два налоговых периода и видит их в списке", async ({
      page,
      tutor: _tutor,
    }) => {
      await page.goto("/profile");
      await page
        .getByRole("tab", { name: "Финансы" })
        .click({ timeout: 15_000 });

      await page.getByRole("button", { name: "Настроить ставки" }).click();

      const dialog = page.getByRole("dialog", { name: "Налоговые ставки" });
      await expect(dialog).toBeVisible();

      await dialog.getByRole("button", { name: "Добавить период" }).click();
      await dialog.getByLabel("Дата начала").nth(0).fill("2024-01-01");
      await dialog.getByLabel("Ставка %").nth(0).fill("4");

      await dialog.getByRole("button", { name: "Добавить период" }).click();
      await dialog.getByLabel("Дата начала").nth(1).fill("2025-01-01");

      await dialog.getByRole("button", { name: "Сохранить" }).click();

      await expect(dialog).not.toBeVisible();
      await expect(page.getByText(/4%/)).toBeVisible();
      await expect(page.getByText(/6%/)).toBeVisible();
    });
  },
);
