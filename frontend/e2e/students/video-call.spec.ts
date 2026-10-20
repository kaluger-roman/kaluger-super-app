import { test, expect } from "../fixtures";
import { createStudentFor } from "../helpers/db";
import { registerStudentDirect, seedStudentAuthInBrowser } from "../helpers/student";

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
    const { token } = await registerStudentDirect(student.id, {
      name: "Иван Звонков",
      email: `student-call-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });

    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    const studentPage = await studentContext.newPage();
    await seedStudentAuthInBrowser(studentPage, token);
    await studentPage.goto("/student/cabinet/schedule");
    await expect(studentPage.getByRole("button", { name: "Позвонить" })).toBeVisible();

    await page.goto("/students");
    await page.getByText("Иван Звонков").click();
    await page.getByRole("dialog").getByRole("button", { name: "Видеозвонок" }).click();
    await expect(page.getByText("Вызываем…")).toBeVisible();

    await expect(studentPage.getByText("Входящий вызов")).toBeVisible();
    await studentPage.getByRole("button", { name: "Принять вызов" }).click();

    await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
    await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();

    await page.getByRole("button", { name: "Завершить звонок" }).click();
    await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();

    await page.goto("/call/history");
    await expect(page.getByText("Иван Звонков")).toBeVisible();

    await studentContext.close();
  });
});
