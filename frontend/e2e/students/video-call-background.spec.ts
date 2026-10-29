import { test, expect } from "../fixtures";
import { connectTutorStudentCall, dropSocket, emulateVisibility } from "../helpers/call";
import { isStudentOnline } from "../helpers/student";

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
});

const RECONNECTING = "Восстанавливаем связь…";
const STUDENT_MINIMIZED = "Ученик свернул приложение";
const STUDENT_MIC_SUSPENDED = "Микрофон ученика приостановлен — ученик свернул приложение";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
// The student's socket comes back after the reconnect delay (5 s) plus the handshake.
const RECOVERY_TIMEOUT = { timeout: 20_000 };

test.describe(
  "Звонок переживает сворачивание и потерю связи",
  { tag: ["@regression", "@students"] },
  () => {
    test("ученик сворачивает приложение и возвращается, звонок продолжается у обоих", async ({
      page,
      tutor,
      browser,
    }) => {
      const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
      try {
        const { studentPage } = await connectTutorStudentCall(
          page,
          studentContext,
          tutor.userId,
          "Мария Свёрнутая",
          "student-hidden"
        );

        await emulateVisibility(studentPage, true);
        await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
        await expect(page.getByText(RECONNECTING)).toBeHidden();
        // A desktop browser keeps the camera and the microphone going in a hidden tab (FR-033).
        await expect(page.getByText(STUDENT_MIC_SUSPENDED)).toBeHidden();

        await emulateVisibility(studentPage, false);
        await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
        await expect(page.getByText(RECONNECTING)).toBeHidden();

        await page.getByRole("button", { name: "Завершить звонок" }).click();
        await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();
      } finally {
        await studentContext.close();
      }
    });

    test("у ученика пропадает связь с сервером: учитель видит «Восстанавливаем связь…», ученик возвращается сам", async ({
      page,
      tutor,
      browser,
    }) => {
      const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
      try {
        const { studentPage, studentUserId } = await connectTutorStudentCall(
          page,
          studentContext,
          tutor.userId,
          "Павел Пропавший",
          "student-dropped"
        );

        await dropSocket("students", studentUserId);

        await expect(page.getByText(RECONNECTING)).toBeVisible();
        await expect(studentPage.getByText(RECONNECTING)).toBeVisible();
        await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();

        await expect.poll(() => isStudentOnline(studentUserId), RECOVERY_TIMEOUT).toBe(true);
        await expect(page.getByText(RECONNECTING)).toBeHidden(RECOVERY_TIMEOUT);
        await expect(studentPage.getByText(RECONNECTING)).toBeHidden(RECOVERY_TIMEOUT);
        await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();

        await studentPage.getByRole("button", { name: "Завершить звонок" }).click();
        await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeHidden();
        await expect(page.getByText("Собеседник завершил звонок")).toBeVisible();
      } finally {
        await studentContext.close();
      }
    });

    test("ученик перезагружает страницу во время звонка, звонок восстанавливается у обоих", async ({
      page,
      tutor,
      browser,
    }) => {
      const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
      try {
        const { studentPage } = await connectTutorStudentCall(
          page,
          studentContext,
          tutor.userId,
          "Глеб Перезагрузов",
          "student-reload"
        );

        await studentPage.reload();

        await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible(
          RECOVERY_TIMEOUT
        );
        await expect(page.getByText(RECONNECTING)).toBeHidden(RECOVERY_TIMEOUT);
        await expect(studentPage.getByText(RECONNECTING)).toBeHidden(RECOVERY_TIMEOUT);
        await expect(page.getByText("Соединение…")).toBeHidden();
        await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();

        await page.getByRole("button", { name: "Завершить звонок" }).click();
        await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();
      } finally {
        await studentContext.close();
      }
    });
  }
);

// The student's own context (browser.newContext) does not take test.use options, so the iPhone
// user agent is set on it directly; the tutor stays on a desktop browser.
test.describe(
  "Звонок с iPhone ученика: честные подписи и подсказка",
  { tag: ["@regression", "@students"] },
  () => {
    test("ученик на iPhone сворачивает приложение: учитель видит, что микрофон ученика приостановлен; подсказка, закрытая один раз, больше не показывается", async ({
      page,
      tutor,
      browser,
    }) => {
      const studentContext = await browser.newContext({
        permissions: ["camera", "microphone"],
        userAgent: IPHONE_UA,
      });
      try {
        const first = await connectTutorStudentCall(
          page,
          studentContext,
          tutor.userId,
          "Ирина Айфонова",
          "student-iphone"
        );
        const hint = first.studentPage.getByRole("note");
        await expect(hint).toContainText("собеседник вас не слышит");

        await emulateVisibility(first.studentPage, true);
        await expect(page.getByText(STUDENT_MIC_SUSPENDED)).toBeVisible();
        await expect(page.getByText(STUDENT_MINIMIZED, { exact: true })).toBeVisible();

        await emulateVisibility(first.studentPage, false);
        await expect(page.getByText(STUDENT_MIC_SUSPENDED)).toBeHidden();
        await expect(page.getByText(STUDENT_MINIMIZED, { exact: true })).toBeHidden();

        await first.studentPage.getByRole("button", { name: "Закрыть подсказку" }).click();
        await expect(hint).toBeHidden();
        await page.getByRole("button", { name: "Завершить звонок" }).click();
        await expect(
          first.studentPage.getByRole("button", { name: "Завершить звонок" })
        ).toBeHidden();
        await first.studentPage.close();

        const second = await connectTutorStudentCall(
          page,
          studentContext,
          tutor.userId,
          "Олег Айфонов",
          "student-iphone-again"
        );
        await expect(
          second.studentPage.getByRole("button", { name: "Завершить звонок" })
        ).toBeVisible();
        await expect(second.studentPage.getByRole("note")).toBeHidden();

        await page.getByRole("button", { name: "Завершить звонок" }).click();
      } finally {
        await studentContext.close();
      }
    });
  }
);
