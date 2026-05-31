import { test, expect } from "../fixtures";
import {
  createStudentFor,
  extractInviteToken,
  issueStudentInvitation,
} from "../helpers/db";

test.describe(
  "Регистрация ученика по приглашению",
  { tag: ["@regression", "@auth"] },
  () => {
    test("ученик открывает инвайт-ссылку, регистрируется и попадает в кабинет с экраном верификации", async ({
      tutor,
      browser,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });

      const { inviteUrl } = await issueStudentInvitation(
        tutor.token,
        student.id,
      );
      const token = extractInviteToken(inviteUrl);

      const studentContext = await browser.newContext();
      const studentPage = await studentContext.newPage();
      try {
        await studentPage.goto(`/student-invite/${token}`);

        await expect(
          studentPage.getByRole("heading", {
            name: "Регистрация в личном кабинете",
          }),
        ).toBeVisible();
        await expect(studentPage.getByText(tutor.credentials.name)).toBeVisible();

        const studentEmail = `student-${Date.now()}@e2e.local`;

        await studentPage.getByLabel("ФИО").fill("Пётр Сидоров");
        await studentPage.getByLabel("Email").fill(studentEmail);
        const passwordInputs = studentPage.locator('input[type="password"]');
        await passwordInputs.first().fill("StrongPass1");
        await passwordInputs.nth(1).fill("StrongPass1");

        await studentPage
          .getByRole("button", { name: "Зарегистрироваться" })
          .click();

        await expect(studentPage).toHaveURL(/\/student\/verify-email$/);
        await expect(
          studentPage.getByRole("heading", {
            level: 1,
            name: "Подтверждение email",
          }),
        ).toBeVisible();
        await expect(studentPage.getByText(studentEmail)).toBeVisible();
      } finally {
        await studentContext.close();
      }
    });
  },
);
