import { test, expect } from "../fixtures";
import { generateCredentials } from "../helpers/auth";
import { createVerifiedUser, resetDatabase } from "../helpers/db";
import { apiRequest } from "../helpers/api";

test.describe("Вход в аккаунт", { tag: ["@regression", "@auth"] }, () => {
  test("учитель вводит верные учётные данные и попадает на дашборд", async ({
    page,
  }) => {
    const credentials = generateCredentials("login-happy");
    await createVerifiedUser(credentials);

    await page.goto("/login");
    await page.getByLabel("Email").fill(credentials.email);
    await page.getByLabel("Пароль").fill(credentials.password);
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/(dashboard)?$/);
    await expect(
      page.getByRole("heading", { name: /Добро пожаловать/i }),
    ).toHaveCount(0);
  });

  test("учитель вводит неверный пароль и видит ошибку", async ({ page }) => {
    const credentials = generateCredentials("login-bad");
    await createVerifiedUser(credentials);

    await page.goto("/login");
    await page.getByLabel("Email").fill(credentials.email);
    await page.getByLabel("Пароль").fill("WrongPassword123");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page.getByText("Неверные учетные данные")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("учитель с неподтверждённым email направляется на верификацию", async ({
    page,
  }) => {
    const credentials = generateCredentials("login-unverified");
    await resetDatabase();
    await apiRequest("/api/auth/register", {
      method: "POST",
      body: credentials,
      expectStatus: 201,
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(credentials.email);
    await page.getByLabel("Пароль").fill(credentials.password);
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/verify-email$/);
  });
});
