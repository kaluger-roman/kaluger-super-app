import { test, expect } from "../fixtures";
import { loginViaApi } from "../helpers/auth";

test.describe(
  "Смена пароля",
  { tag: ["@regression", "@profile"] },
  () => {
    test("учитель меняет пароль и может войти с новым паролем", async ({
      page,
      tutor,
    }) => {
      const newPassword = "NewPass456";

      await page.goto("/profile");
      await page.getByRole("tab", { name: "Безопасность" }).click();

      await page.getByRole("button", { name: "Изменить" }).nth(1).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await dialog
        .getByLabel("Текущий пароль")
        .fill(tutor.credentials.password);
      await dialog.getByLabel("Новый пароль").fill(newPassword);
      await dialog.getByLabel("Подтверждение пароля").fill(newPassword);

      await dialog.getByRole("button", { name: /Сменить пароль|Сохранить/ }).click();

      await expect(page.getByText(/Пароль успешно изменён/)).toBeVisible();

      const { token } = await loginViaApi(tutor.credentials.email, newPassword);
      expect(token).toBeTruthy();
    });
  },
);
