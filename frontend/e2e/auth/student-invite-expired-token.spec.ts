import { test, expect } from "../fixtures";
import { apiRequest } from "../helpers/api";
import {
  createStudentFor,
  createVerifiedUser,
  extractInviteToken,
  issueStudentInvitation,
} from "../helpers/db";
import { generateCredentials } from "../helpers/auth";
import { STUDENT_PASSWORD } from "../helpers/student";

test.describe(
  "Невалидная инвайт-ссылка ученика",
  { tag: ["@regression", "@auth"] },
  () => {
    test("ученик открывает ссылку с неизвестным токеном и видит сообщение", async ({
      page,
    }) => {
      await page.goto("/student-invite/totally-unknown-token");

      await expect(page.getByText(/Ссылка недействительна/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Зарегистрироваться" }),
      ).toHaveCount(0);
    });

    test("ученик открывает уже использованную ссылку и видит сообщение", async ({
      page,
    }) => {
      const tutorCreds = generateCredentials("tutor");
      const { user, token: tutorToken } = await createVerifiedUser(tutorCreds);
      const { student } = await createStudentFor(user.id, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });

      const { inviteUrl } = await issueStudentInvitation(tutorToken, student.id);
      const inviteToken = extractInviteToken(inviteUrl);

      // Потребляем токен реальной регистрацией — после этого он становится USED.
      await apiRequest("/api/student-auth/register", {
        method: "POST",
        body: {
          token: inviteToken,
          name: "Пётр Сидоров",
          email: `student-${Date.now()}@e2e.local`,
          password: STUDENT_PASSWORD,
          passwordConfirmation: STUDENT_PASSWORD,
        },
        expectStatus: 201,
      });

      await page.goto(`/student-invite/${inviteToken}`);

      await expect(page.getByText(/Ссылка недействительна/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Зарегистрироваться" }),
      ).toHaveCount(0);
    });
  },
);
