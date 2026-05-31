import { test, expect } from "../fixtures";

test.describe(
  "Выход из аккаунта через диалог подтверждения",
  { tag: ["@regression", "@profile"] },
  () => {
    test("учитель отменяет выход, затем подтверждает и попадает на страницу входа", async ({
      page,
      tutor,
    }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Открыть меню" }).click();

      await page.getByRole("button", { name: "Выйти" }).click();

      const dialog = page.getByRole("dialog", { name: "Выход из аккаунта" });
      await expect(dialog).toBeVisible();

      // Отмена — сессия остаётся, на страницу входа не уходим.
      await dialog.getByRole("button", { name: "Отмена" }).click();
      await expect(dialog).toBeHidden();
      await expect(page).not.toHaveURL(/\/login$/);

      // Повторный вызов и подтверждение — выход.
      await page.getByRole("button", { name: "Выйти" }).click();
      await dialog.getByRole("button", { name: "Выйти" }).click();

      await expect(page).toHaveURL(/\/login$/);
    });
  },
);
