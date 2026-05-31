import { test, expect } from "../fixtures";
import { createStudentFor, createVerifiedUser } from "../helpers/db";
import { generateCredentials } from "../helpers/auth";
import {
  deleteStudentCard,
  registerStudentDirect,
  seedStudentAuthInBrowser,
} from "../helpers/student";

test.describe(
  "Ученик смотрит свои настройки",
  { tag: ["@regression", "@lessons"] },
  () => {
    const setup = async () => {
      const tutorCreds = generateCredentials("tutor");
      const { user, token: tutorToken } = await createVerifiedUser({
        ...tutorCreds,
        name: "Анна Петрова",
      });
      const { student } = await createStudentFor(user.id, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });
      const registered = await registerStudentDirect(student.id, {
        name: "Пётр Сидоров",
        email: `student-${Date.now()}@e2e.local`,
        isEmailVerified: true,
      });
      return { tutorToken, studentId: student.id, registered };
    };

    test("ученик видит имя, подтверждённый email и имя учителя", async ({
      page,
    }) => {
      const { registered } = await setup();
      await seedStudentAuthInBrowser(page, registered.token);

      await page.goto("/student/cabinet/settings");

      await expect(page.getByText("Пётр Сидоров")).toBeVisible();
      await expect(page.getByText("Подтверждён", { exact: true })).toBeVisible();
      await expect(page.getByText("Анна Петрова")).toBeVisible();
    });

    test("если карточка ученика удалена у учителя — показывается плейсхолдер", async ({
      page,
    }) => {
      const { tutorToken, studentId, registered } = await setup();
      await deleteStudentCard(tutorToken, studentId);
      await seedStudentAuthInBrowser(page, registered.token);

      await page.goto("/student/cabinet/settings");

      await expect(
        page.getByText("Связь с преподавателем прекращена"),
      ).toBeVisible();
    });
  },
);
