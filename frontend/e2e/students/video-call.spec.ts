import { test, expect } from "../fixtures";
import { seedAuthInBrowser } from "../helpers/auth";
import { callTutorFromLesson, confirmCall, connectTutorStudentCall } from "../helpers/call";
import { createLesson, createStudentFor } from "../helpers/db";
import {
  currentWeekSlot,
  isStudentOnline,
  registerStudentDirect,
  seedStudentAuthInBrowser,
} from "../helpers/student";

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--auto-select-desktop-capture-source=Entire screen",
    ],
  },
});

test.describe("Видеозвонок ученику", { tag: ["@regression", "@students"] }, () => {
  test("учитель звонит ученику из карточки, ученик принимает, звонок завершается и попадает в историю", async ({
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
        "Иван Звонков",
        "student-call"
      );

      await page.getByRole("button", { name: "Завершить звонок" }).click();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();

      await page.goto("/call/history");
      const row = page.getByRole("listitem").filter({ hasText: "Иван Звонков" });
      await expect(row).toContainText("Завершён");
    } finally {
      await studentContext.close();
    }
  });

  test("учитель разворачивает собеседника во весь экран и сворачивает обратно, звонок продолжается", async ({
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
        "Анна Экранова",
        "student-fullscreen"
      );
      const controls = page.getByTestId("fullscreen-controls");

      await page.getByRole("button", { name: "Во весь экран" }).click();
      await expect(page.getByRole("button", { name: "Свернуть" })).toBeVisible();
      await expect(page.getByTestId("local-pip")).toBeHidden();

      // Over the video, not over the controls: a pointer over them would keep them shown.
      const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await expect(controls).toHaveAttribute("data-visible", "false", { timeout: 10_000 });
      await page.mouse.move(viewport.width / 2 + 40, viewport.height / 2 + 40);
      await expect(controls).toHaveAttribute("data-visible", "true");

      await studentPage.getByRole("button", { name: "Демонстрация экрана" }).click();
      await expect(page.getByRole("group", { name: "Масштаб демонстрации" })).toBeAttached();
      // The share may take longer than the idle timeout to arrive: bring the controls back first.
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await expect(controls).toHaveAttribute("data-visible", "true");
      await page.getByRole("button", { name: "Увеличить" }).click();
      await expect(page.getByText("150%")).toBeVisible();
      await page.getByRole("button", { name: "Исходный размер" }).click();
      await expect(page.getByText("100%")).toBeVisible();
      await expect(page.getByRole("button", { name: "Исходный размер" })).toBeHidden();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Во весь экран" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();

      await page.getByTestId("remote-stage").dblclick();
      await expect(page.getByRole("button", { name: "Свернуть" })).toBeVisible();
      await page.getByTestId("remote-stage").dblclick();
      await expect(page.getByRole("button", { name: "Во весь экран" })).toBeVisible();

      await page.getByRole("button", { name: "Завершить звонок" }).click();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();
    } finally {
      await studentContext.close();
    }
  });

  test("вторая вкладка учителя забирает звонки, первая показывает баннер и возвращает их себе", async ({
    page,
    tutor,
    browser,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Пётр Вкладкин" });
    const slot = currentWeekSlot(12);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: slot.start,
      endTime: slot.end,
      subject: "MATHEMATICS",
    });
    const { token, studentUser } = await registerStudentDirect(student.id, {
      name: "Пётр Вкладкин",
      email: `student-tabs-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });

    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    try {
      const studentPage = await studentContext.newPage();
      await seedStudentAuthInBrowser(studentPage, token);
      await studentPage.goto("/student/cabinet/schedule");
      await expect.poll(() => isStudentOnline(studentUser.id)).toBe(true);

      await page.goto("/students");
      const secondTab = await page.context().newPage();
      await seedAuthInBrowser(secondTab, tutor.token);
      await secondTab.goto("/students");

      const banner = "Приложение открыто в другой вкладке";
      await expect(page.getByText(banner)).toBeVisible();
      await expect(secondTab.getByText(banner)).toBeHidden();

      await page.getByRole("button", { name: "Использовать здесь" }).click();
      await expect(page.getByText(banner)).toBeHidden();
      await expect(secondTab.getByText(banner)).toBeVisible();

      await callTutorFromLesson(studentPage, "Математика");
      await expect(page.getByText("Входящий вызов")).toBeVisible();
      await expect(secondTab.getByText("Входящий вызов")).toBeHidden();

      await page.getByRole("button", { name: "Отклонить вызов" }).click();
      await expect(studentPage.getByRole("button", { name: "Отменить вызов" })).toBeHidden();
    } finally {
      await studentContext.close();
    }
  });

  test("новая вкладка учителя во время звонка не обрывает его и показывает, что звонок идёт в другой вкладке", async ({
    page,
    tutor,
    browser,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Олег Звонкий" });
    const { token, studentUser } = await registerStudentDirect(student.id, {
      name: "Олег Звонкий",
      email: `student-held-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });

    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    try {
      const studentPage = await studentContext.newPage();
      await seedStudentAuthInBrowser(studentPage, token);
      await studentPage.goto("/student/cabinet/schedule");
      await expect.poll(() => isStudentOnline(studentUser.id)).toBe(true);

      await page.goto("/students");
      await page.getByText("Олег Звонкий").click();
      await page.getByRole("dialog").getByRole("button", { name: "Видеозвонок" }).click();
      await confirmCall(page);
      await studentPage.getByRole("button", { name: "Принять вызов" }).click();
      await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
      await expect(page.getByText("Соединение…")).toBeHidden();

      const secondTab = await page.context().newPage();
      await seedAuthInBrowser(secondTab, tutor.token);
      await secondTab.goto("/students");

      await expect(
        secondTab.getByText("В другой вкладке или на другом устройстве идёт звонок")
      ).toBeVisible();
      await expect(secondTab.getByRole("button", { name: "Использовать здесь" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
      await expect(page.getByText("Соединение…")).toBeHidden();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();

      await page.getByRole("button", { name: "Завершить звонок" }).click();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();

      // The server releases the waiting tab once the call is over; it may take the connection then.
      await expect(secondTab.getByRole("button", { name: "Использовать здесь" })).toBeEnabled();
    } finally {
      await studentContext.close();
    }
  });

  test("ученик звонит репетитору не в сети: экран вызова не мелькает, в истории «Без ответа»", async ({
    tutor,
    browser,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Олег Тихий" });
    const slot = currentWeekSlot(12);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: slot.start,
      endTime: slot.end,
      subject: "PHYSICS",
    });
    const { token, studentUser } = await registerStudentDirect(student.id, {
      name: "Олег Тихий",
      email: `student-offline-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });

    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    try {
      const studentPage = await studentContext.newPage();
      await seedStudentAuthInBrowser(studentPage, token);
      await studentPage.goto("/student/cabinet/schedule");
      await expect.poll(() => isStudentOnline(studentUser.id)).toBe(true);
      // Catches the dialing screen even if it shows for a single frame.
      await studentPage.evaluate(() => {
        const seen = { dialing: false };
        Object.assign(window, { __dialingSeen: seen });
        new MutationObserver(() => {
          if (document.querySelector('[aria-label="Отменить вызов"]')) seen.dialing = true;
        }).observe(document.body, { childList: true, subtree: true });
      });

      await callTutorFromLesson(studentPage, "Физика");

      await expect(studentPage.getByText("Преподаватель сейчас не в сети")).toBeVisible();
      const dialingSeen = await studentPage.evaluate(
        () => (window as unknown as { __dialingSeen: { dialing: boolean } }).__dialingSeen.dialing
      );
      expect(dialingSeen).toBe(false);

      await studentPage.getByRole("button", { name: "Открыть меню" }).click();
      await studentPage.getByRole("button", { name: "История звонков" }).click();
      await expect(studentPage.getByText("Без ответа")).toBeVisible();
      await expect(studentPage.getByText("Пропущен")).toBeHidden();
    } finally {
      await studentContext.close();
    }
  });
});
