import { test, expect } from "../fixtures";
import { createStudentFor, createVerifiedUser, seedCallRecord } from "../helpers/db";
import { registerStudentDirect, seedStudentAuthInBrowser } from "../helpers/student";

test.describe("История звонков", { tag: ["@regression", "@students"] }, () => {
  test("учитель открывает историю звонков из меню и видит прошедший звонок", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Алексей Смирнов" });
    await seedCallRecord({
      tutorId: tutor.userId,
      studentId: student.id,
      status: "COMPLETED",
      durationSeconds: 125,
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Открыть меню" }).click();
    await page.getByRole("button", { name: "История звонков" }).click();

    await expect(page).toHaveURL(/\/call\/history$/);
    await expect(page.getByText("Алексей Смирнов")).toBeVisible();
    await expect(page.getByText("Завершён")).toBeVisible();
    await expect(page.getByText("2:05", { exact: true })).toBeVisible();
  });

  test("ученик открывает историю звонков в кабинете и видит звонок репетитора", async ({
    page,
  }) => {
    const { user: tutorUser } = await createVerifiedUser({
      email: `tutor-${Date.now()}@e2e.local`,
      password: "StrongPass1",
      name: "Анна Петрова",
    });
    const { student } = await createStudentFor(tutorUser.id, { name: "Иван Ученик" });
    const { token } = await registerStudentDirect(student.id, {
      name: "Иван Ученик",
      email: `student-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });
    await seedCallRecord({
      tutorId: tutorUser.id,
      studentId: student.id,
      status: "MISSED",
    });
    await seedStudentAuthInBrowser(page, token);

    await page.goto("/student/cabinet/schedule");
    await page.getByRole("button", { name: "Открыть меню" }).click();
    await page.getByRole("button", { name: "История звонков" }).click();

    await expect(page).toHaveURL(/\/student\/cabinet\/calls$/);
    await expect(page.getByText("Анна Петрова")).toBeVisible();
    await expect(page.getByText("Пропущен")).toBeVisible();
  });
});
