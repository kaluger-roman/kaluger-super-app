import { test, expect } from "../fixtures";
import { createStudentFor, createVerifiedUser } from "../helpers/db";
import { generateCredentials } from "../helpers/auth";
import { registerStudentDirect, STUDENT_PASSWORD } from "../helpers/student";

test.describe(
  "Логин ученика через переключатель Преподаватель/Ученик",
  { tag: ["@regression", "@auth"] },
  () => {
    const setupStudent = async (): Promise<{ email: string }> => {
      const tutorCreds = generateCredentials("tutor");
      const { user } = await createVerifiedUser(tutorCreds);
      const { student } = await createStudentFor(user.id, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });
      const email = `student-${Date.now()}@e2e.local`;
      await registerStudentDirect(student.id, {
        name: "Пётр Сидоров",
        email,
        isEmailVerified: true,
      });
      return { email };
    };

    test("ученик переключает роль на «Ученик» и попадает в свой кабинет", async ({
      page,
    }) => {
      const { email } = await setupStudent();

      await page.goto("/login");
      await page.getByRole("button", { name: "Ученик" }).click();

      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Пароль").fill(STUDENT_PASSWORD);
      await page.getByRole("button", { name: "Войти" }).click();

      await expect(page).toHaveURL(/\/student\/cabinet\/schedule$/);
      await expect(
        page.getByRole("heading", { name: "Расписание" }),
      ).toBeVisible();
    });

    test("ученик не может войти как преподаватель тем же email и паролем", async ({
      page,
    }) => {
      const { email } = await setupStudent();

      await page.goto("/login");
      // Режим «Преподаватель» активен по умолчанию — не переключаем.
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Пароль").fill(STUDENT_PASSWORD);
      await page.getByRole("button", { name: "Войти" }).click();

      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
    });
  },
);
