import { test, expect } from "../fixtures";
import { createStudentFor } from "../helpers/db";
import {
  isStudentOnline,
  registerStudentDirect,
  seedStudentAuthInBrowser,
} from "../helpers/student";

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
});

test.describe("Видеозвонок ученику", { tag: ["@regression", "@students"] }, () => {
  test("учитель звонит ученику из карточки, ученик принимает, звонок завершается и попадает в историю", async ({
    page,
    tutor,
    browser,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Иван Звонков" });
    const { token, studentUser } = await registerStudentDirect(student.id, {
      name: "Иван Звонков",
      email: `student-call-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });

    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    try {
      const studentPage = await studentContext.newPage();
      await seedStudentAuthInBrowser(studentPage, token);
      await studentPage.goto("/student/cabinet/schedule");
      // The student can take the call only once its socket is registered on the server.
      await expect.poll(() => isStudentOnline(studentUser.id)).toBe(true);

      await page.goto("/students");
      await page.getByText("Иван Звонков").click();
      await page.getByRole("dialog").getByRole("button", { name: "Видеозвонок" }).click();
      await expect(page.getByText("Вызываем…")).toBeVisible();

      await expect(studentPage.getByText("Входящий вызов")).toBeVisible();
      await studentPage.getByRole("button", { name: "Принять вызов" }).click();

      await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
      // Media connected: the call leaves the connecting state on both sides.
      await expect(page.getByText("Соединение…")).toBeHidden();
      await expect(studentPage.getByText("Соединение…")).toBeHidden();

      await page.getByRole("button", { name: "Завершить звонок" }).click();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();

      await page.goto("/call/history");
      const row = page.getByRole("listitem").filter({ hasText: "Иван Звонков" });
      await expect(row).toContainText("Завершён");
    } finally {
      await studentContext.close();
    }
  });
});
