import { test, expect } from "../fixtures";
import { apiRequest } from "../helpers/api";
import { generateCredentials, loginViaApi } from "../helpers/auth";
import { waitForMail, clearMailbox } from "../helpers/mailbox";

test.describe("Смена email с верификацией кодом", { tag: ["@regression", "@profile"] }, () => {
  test("учитель меняет email и может войти только с новым адресом", async ({ page, tutor }) => {
    const oldEmail = tutor.credentials.email;
    const { email: newEmail } = generateCredentials("new-email");

    await clearMailbox();

    await page.goto("/profile");
    await page.getByRole("tab", { name: "Безопасность" }).click();

    await page.getByRole("button", { name: "Изменить" }).nth(0).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Новый email").fill(newEmail);
    await dialog.getByLabel("Текущий пароль").fill(tutor.credentials.password);

    await dialog.getByRole("button", { name: "Сменить email" }).click();

    const mail = await waitForMail(
      newEmail,
      (m) => Boolean(m.verificationCode) && m.subject === "Подтверждение смены email"
    );
    const code = mail.verificationCode!;

    await expect(dialog.getByRole("textbox", { name: /^Цифра \d из 6$/ })).toHaveCount(6);
    for (let i = 0; i < 6; i += 1) {
      await dialog.getByLabel(`Цифра ${i + 1} из 6`).fill(code[i]);
    }

    await dialog.getByRole("button", { name: "Подтвердить" }).click();

    await expect(page.getByText(/Email успешно изменён/i)).toBeVisible();

    const { token } = await loginViaApi(newEmail, tutor.credentials.password);
    expect(token).toBeTruthy();

    await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email: oldEmail, password: tutor.credentials.password },
      expectStatus: 401,
    });
  });
});
