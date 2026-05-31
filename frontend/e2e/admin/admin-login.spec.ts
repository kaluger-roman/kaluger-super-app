import { test, expect } from "../fixtures";

test.describe("Вход в админ-панель", { tag: ["@regression", "@admin"] }, () => {
  test("неверный пароль показывает ошибку и не пускает в панель", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: "Админ-панель" }),
    ).toBeVisible();

    await page.getByLabel("Email").fill("admin@tutor.kaluger.ru");
    await page.getByLabel("Пароль").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page.getByText("Неверный email или пароль")).toBeVisible();
    // В панель не пустило — вкладки дашборда отсутствуют.
    await expect(page.getByRole("tab", { name: "Бэкапы" })).toHaveCount(0);
  });
});
