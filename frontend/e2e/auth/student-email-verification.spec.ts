import { test, expect } from "../fixtures";
import { createStudentFor, createVerifiedUser } from "../helpers/db";
import { generateCredentials } from "../helpers/auth";
import {
  registerStudentDirect,
  seedStudentAuthInBrowser,
} from "../helpers/student";

test.describe(
  "Подтверждение email ученика",
  { tag: ["@regression", "@auth"] },
  () => {
    const setupUnverifiedStudent = async (withCode: boolean) => {
      const { user } = await createVerifiedUser(generateCredentials("tutor"));
      const { student } = await createStudentFor(user.id, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });
      return registerStudentDirect(student.id, {
        name: "Пётр Сидоров",
        email: `student-${Date.now()}@e2e.local`,
        isEmailVerified: false,
        withCode,
      });
    };

    test("ученик вводит 6-значный код и попадает в кабинет", async ({
      page,
    }) => {
      const { token, verificationCode } = await setupUnverifiedStudent(true);
      await seedStudentAuthInBrowser(page, token);

      await page.goto("/student/verify-email");
      await expect(
        page.getByRole("heading", { level: 1, name: "Подтверждение email" }),
      ).toBeVisible();

      await page.getByLabel("Код").fill(verificationCode!);
      await page.getByRole("button", { name: "Подтвердить" }).click();

      await expect(page).toHaveURL(/\/student\/cabinet\/schedule$/);
      await expect(
        page.getByRole("heading", { name: "Расписание" }),
      ).toBeVisible();
    });

    test("кнопка «Отправить заново» уходит в обратный отсчёт после клика", async ({
      page,
    }) => {
      const { token } = await setupUnverifiedStudent(false);
      await seedStudentAuthInBrowser(page, token);

      await page.goto("/student/verify-email");

      const resendButton = page.getByRole("button", {
        name: "Отправить заново",
      });
      await expect(resendButton).toBeEnabled();
      await resendButton.click();

      await expect(
        page.getByRole("button", { name: /Отправить заново через \d+с/ }),
      ).toBeDisabled();
    });
  },
);
