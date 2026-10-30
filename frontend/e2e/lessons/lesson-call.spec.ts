import { test, expect } from "../fixtures";
import { callTutorFromLesson, confirmCall, isTutorOnline } from "../helpers/call";
import { createLesson, createStudentFor } from "../helpers/db";
import {
  currentWeekSlot,
  isStudentOnline,
  registerStudentDirect,
  seedStudentAuthInBrowser,
} from "../helpers/student";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
});

test.describe("Звонок по уроку", { tag: ["@regression", "@lessons"] }, () => {
  test("учитель звонит из окна урока, подтверждает звонок и видит его в списке звонков урока, а ученик видит урок во входящем", async ({
    page,
    tutor,
    browser,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Иван Урокин" });
    const start = new Date(Date.now() + DAY_MS);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: start,
      endTime: new Date(start.getTime() + HOUR_MS),
      subject: "PHYSICS",
    });
    const { token, studentUser } = await registerStudentDirect(student.id, {
      name: "Иван Урокин",
      email: `student-lesson-call-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });

    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    try {
      const studentPage = await studentContext.newPage();
      await seedStudentAuthInBrowser(studentPage, token);
      await studentPage.goto("/student/cabinet/schedule");
      await expect.poll(() => isStudentOnline(studentUser.id)).toBe(true);

      await page.goto("/lessons");
      await page
        .getByRole("heading", { name: /Иван Урокин/ })
        .first()
        .click();
      const lessonDialog = page
        .getByRole("dialog")
        .filter({ has: page.getByRole("button", { name: "Редактировать" }) });
      await lessonDialog.getByRole("button", { name: "Позвонить" }).click();

      const confirm = page.getByRole("dialog", { name: "Начать видеозвонок?" });
      await expect(confirm).toContainText("Иван Урокин");
      await expect(confirm).toContainText("Звонок по уроку");
      await expect(confirm).toContainText("Физика");
      await confirm.getByRole("button", { name: "Отмена" }).click();
      await expect(confirm).toBeHidden();
      await expect(lessonDialog).toBeVisible();

      await lessonDialog.getByRole("button", { name: "Позвонить" }).click();
      await confirmCall(page);
      await expect(lessonDialog).toBeHidden();
      await expect(page.getByText("Вызываем…")).toBeVisible();

      await expect(studentPage.getByText("Входящий вызов")).toBeVisible();
      await expect(studentPage.getByText("Звонок по уроку")).toBeVisible();
      await expect(studentPage.getByRole("dialog")).toContainText("Физика");
      await studentPage.getByRole("button", { name: "Принять вызов" }).click();
      await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
      await expect(page.getByText("Соединение…")).toBeHidden();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
      await page.getByRole("button", { name: "Завершить звонок" }).click();
      await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();

      await page
        .getByRole("heading", { name: /Иван Урокин/ })
        .first()
        .click();
      const calls = lessonDialog.getByRole("list", { name: "Звонки по уроку" });
      await expect(calls).toContainText("Исходящий");
      await expect(calls).toContainText("Завершён");
    } finally {
      await studentContext.close();
    }
  });

  test("ученик звонит из окна урока в расписании, учитель видит урок во входящем", async ({
    page,
    tutor,
    browser,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Пётр Расписанов" });
    const slot = currentWeekSlot(12);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: slot.start,
      endTime: slot.end,
      subject: "MATHEMATICS",
    });
    const { token } = await registerStudentDirect(student.id, {
      name: "Пётр Расписанов",
      email: `student-schedule-call-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });

    await page.goto("/lessons");
    await expect.poll(() => isTutorOnline(tutor.userId)).toBe(true);

    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    try {
      const studentPage = await studentContext.newPage();
      await seedStudentAuthInBrowser(studentPage, token);
      await studentPage.goto("/student/cabinet/schedule");

      await studentPage.getByRole("button", { name: /Математика/ }).click();
      const lessonDialog = studentPage.getByRole("dialog", { name: "Урок" });
      await expect(lessonDialog).toContainText("Математика");
      await lessonDialog.getByRole("button", { name: "Закрыть" }).click();
      await expect(lessonDialog).toBeHidden();

      await callTutorFromLesson(studentPage, "Математика");
      await expect(lessonDialog).toBeHidden();

      await expect(page.getByText("Входящий вызов")).toBeVisible();
      await expect(page.getByText("Звонок по уроку")).toBeVisible();
      await expect(studentPage.getByRole("button", { name: "Отменить вызов" })).toBeVisible();
      await page.getByRole("button", { name: "Отклонить вызов" }).click();
      await expect(studentPage.getByRole("button", { name: "Отменить вызов" })).toBeHidden();
    } finally {
      await studentContext.close();
    }
  });

  test("учитель открывает урок ученика без кабинета и не видит кнопку «Позвонить»", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Мария Безкабинетная" });
    const start = new Date(Date.now() + DAY_MS);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: start,
      endTime: new Date(start.getTime() + HOUR_MS),
    });

    await page.goto("/lessons");
    await page
      .getByRole("heading", { name: /Мария Безкабинетная/ })
      .first()
      .click();

    const lessonDialog = page.getByRole("dialog");
    await expect(lessonDialog.getByRole("button", { name: "Редактировать" })).toBeVisible();
    await expect(lessonDialog.getByRole("button", { name: "Позвонить" })).toHaveCount(0);
  });
});
