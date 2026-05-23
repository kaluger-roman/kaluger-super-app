import { test, expect } from "../fixtures";
import { generateCredentials, loginViaApi } from "../helpers/auth";
import { createVerifiedUser } from "../helpers/db";
import { waitForMail } from "../helpers/mailbox";

test.describe(
  "Восстановление пароля",
  { tag: ["@regression", "@auth"] },
  () => {
    test("учитель запрашивает сброс пароля, переходит по ссылке из письма, задаёт новый пароль и входит с ним", async ({
      page,
    }) => {
      const credentials = generateCredentials("forgot-pw");
      await createVerifiedUser(credentials);

      const newPassword = "NewPassword456";

      await page.goto("/forgot-password");
      await page.getByLabel("Email").fill(credentials.email);
      await page.getByRole("button", { name: "Отправить" }).click();

      await expect(
        page.getByText(/Если адрес зарегистрирован, мы отправили на него письмо/i),
      ).toBeVisible();

      const mail = await waitForMail(credentials.email, (m) =>
        Boolean(m.resetUrl),
      );

      await page.goto(mail.resetUrl!);
      await expect(page).toHaveURL(/\/reset-password\?token=/);

      await expect(page.getByLabel("Новый пароль")).toBeVisible();

      await page.getByLabel("Новый пароль").fill(newPassword);
      await page.getByLabel("Подтверждение пароля").fill(newPassword);
      await page.getByRole("button", { name: "Сохранить" }).click();

      await expect(page.getByText("Пароль успешно изменён")).toBeVisible();

      const { token } = await loginViaApi(credentials.email, newPassword);
      expect(token).toBeTruthy();
    });
  },
);
