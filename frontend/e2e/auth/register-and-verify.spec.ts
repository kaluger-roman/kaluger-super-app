import { test, expect } from "../fixtures";
import { generateCredentials } from "../helpers/auth";
import { waitForMail } from "../helpers/mailbox";

test.describe("Регистрация и верификация email", { tag: ["@regression", "@auth"] }, () => {
  test("учитель регистрируется, подтверждает email по коду из письма и попадает на дашборд", async ({
    page,
  }) => {
    const credentials = generateCredentials("register");

    await page.goto("/register");
    await page.getByLabel(/Имя/).fill(credentials.name);
    await page.getByLabel(/Email/).fill(credentials.email);
    await page.getByLabel(/^Пароль/).fill(credentials.password);
    await page.getByLabel(/^Подтвердите пароль/).fill(credentials.password);
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();

    await expect(page).toHaveURL(/\/verify-email$/);

    const mail = await waitForMail(credentials.email, (m) => Boolean(m.verificationCode));

    const firstCodeInput = page.getByLabel("Цифра 1 из 6");
    await firstCodeInput.click();
    await firstCodeInput.pressSequentially(mail.verificationCode!);

    await expect(page).toHaveURL(/\/(dashboard)?$/);
  });
});
