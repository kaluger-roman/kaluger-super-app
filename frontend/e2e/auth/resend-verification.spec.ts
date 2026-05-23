import { test, expect } from "../fixtures";
import { generateCredentials } from "../helpers/auth";
import { apiRequest } from "../helpers/api";
import { waitForMail, clearMailbox } from "../helpers/mailbox";

test.describe(
  "Повторная отправка кода верификации",
  { tag: ["@regression", "@auth"] },
  () => {
    test("учитель нажимает повторную отправку кода, получает новый код, вводит его и становится верифицированным", async ({
      page,
    }) => {
      const credentials = generateCredentials("resend");

      await apiRequest("/api/auth/register", {
        method: "POST",
        body: credentials,
        expectStatus: 201,
      });

      const firstMail = await waitForMail(credentials.email, (m) =>
        Boolean(m.verificationCode),
      );
      const firstCode = firstMail.verificationCode!;

      await clearMailbox();

      await page.addInitScript((email: string) => {
        window.localStorage.setItem("verificationEmail", email);
      }, credentials.email);

      await page.goto("/verify-email");

      await expect(page.getByText(credentials.email)).toBeVisible();

      await page
        .getByRole("button", { name: "Отправить код повторно" })
        .click();

      const secondMail = await waitForMail(credentials.email, (m) =>
        Boolean(m.verificationCode),
      );
      const secondCode = secondMail.verificationCode!;

      expect(secondCode).not.toBe(firstCode);

      const firstCodeInput = page
        .locator('input[type="text"][inputmode="numeric"]')
        .first();
      await firstCodeInput.click();
      await firstCodeInput.pressSequentially(secondCode);

      await expect(page).toHaveURL(/\/(dashboard)?$/);
    });
  },
);
