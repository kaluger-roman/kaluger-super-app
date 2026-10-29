import type { Browser, Page } from "@playwright/test";

import { test, expect } from "../fixtures";
import {
  callTutorFromLesson,
  confirmCall,
  installSinkPushManager,
  isTutorOnline,
  isWebPushConfigured,
  seedTutorSinkSubscription,
  sinkPushes,
} from "../helpers/call";
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
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
});

const INVITE_TITLE = "Включите уведомления, чтобы не пропускать звонки преподавателя";

type StudentDevice = { page: Page; close: () => Promise<void> };

// The student device: its push subscriptions land in the backend sink.
const openStudentDevice = async (
  browser: Browser,
  token: string,
  sinkKey: string
): Promise<StudentDevice> => {
  const context = await browser.newContext();
  await installSinkPushManager(context, sinkKey);
  const page = await context.newPage();
  await seedStudentAuthInBrowser(page, token);
  return { page, close: () => context.close() };
};

const callStudentFromCard = async (page: Page, studentName: string): Promise<void> => {
  await page.goto("/students");
  await page.getByText(studentName).click();
  await page.getByRole("dialog").getByRole("button", { name: "Видеозвонок" }).click();
  await confirmCall(page);
};

test.describe("Уведомления о звонках", { tag: ["@regression", "@students"] }, () => {
  test.beforeAll(async () => {
    if (!(await isWebPushConfigured())) {
      throw new Error(
        "E2E-бэкенд запущен без VAPID-ключей (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT): " +
          "уведомления о звонках скрыты, сценарий проверить нельзя"
      );
    }
  });

  test("ученик включает уведомления в кабинете, и звонок учителя при закрытом приложении приходит уведомлением", async ({
    page,
    tutor,
    browser,
  }) => {
    const studentName = "Нина Звонкая";
    const { student } = await createStudentFor(tutor.userId, { name: studentName });
    const { token, studentUser } = await registerStudentDirect(student.id, {
      name: studentName,
      email: `student-notify-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });
    const sinkKey = `student-on-${studentUser.id}`;

    const device = await openStudentDevice(browser, token, sinkKey);
    try {
      await device.page.goto("/student/cabinet/schedule");
      await expect(device.page.getByText(INVITE_TITLE)).toBeVisible();
      await device.page.getByRole("button", { name: "Включить" }).click();
      await expect(device.page.getByText(INVITE_TITLE)).toBeHidden();

      await device.page.goto("/student/cabinet/settings");
      await expect(device.page.getByText("Уведомления о звонках: включены")).toBeVisible();
    } finally {
      await device.close();
    }
    await expect.poll(() => isStudentOnline(studentUser.id)).toBe(false);

    await callStudentFromCard(page, studentName);

    await expect(page.getByText("Вызываем…")).toBeVisible();
    await expect
      .poll(() => sinkPushes(sinkKey))
      .toEqual([expect.objectContaining({ urgency: "high" })]);
    await page.getByRole("button", { name: "Отменить вызов" }).click();
  });

  test("ученик выходит из аккаунта, и уведомления о звонках на это устройство больше не приходят", async ({
    page,
    tutor,
    browser,
  }) => {
    const studentName = "Олег Ушедший";
    const { student } = await createStudentFor(tutor.userId, { name: studentName });
    const { token, studentUser } = await registerStudentDirect(student.id, {
      name: studentName,
      email: `student-logout-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });
    const sinkKey = `student-out-${studentUser.id}`;

    const device = await openStudentDevice(browser, token, sinkKey);
    try {
      await device.page.goto("/student/cabinet/settings");
      const callSwitch = device.page.getByRole("checkbox", { name: "Уведомления о звонках" });
      await expect(callSwitch).not.toBeChecked();
      await callSwitch.click();
      await expect(device.page.getByText("Уведомления о звонках: включены")).toBeVisible();

      await device.page.getByRole("button", { name: "Открыть меню" }).click();
      await device.page.getByRole("button", { name: "Выйти" }).click();
      await expect(device.page).toHaveURL(/\/login$/);
    } finally {
      await device.close();
    }
    await expect.poll(() => isStudentOnline(studentUser.id)).toBe(false);

    await callStudentFromCard(page, studentName);

    await expect(page.getByText("Ученик сейчас не в сети")).toBeVisible();
    expect(await sinkPushes(sinkKey)).toEqual([]);
  });

  test("учитель выключает уведомления о входящих звонках: ученик видит, что преподаватель не в сети", async ({
    page,
    tutor,
    browser,
  }) => {
    const studentName = "Пётр Звонящий";
    const { student } = await createStudentFor(tutor.userId, { name: studentName });
    const slot = currentWeekSlot(12);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: slot.start,
      endTime: slot.end,
      subject: "PHYSICS",
    });
    const { token } = await registerStudentDirect(student.id, {
      name: studentName,
      email: `student-calls-tutor-${Date.now()}@e2e.local`,
      isEmailVerified: true,
    });
    // Another device of the tutor keeps its subscription: the setting alone must stop its push.
    const sinkKey = `tutor-${tutor.userId}`;
    await seedTutorSinkSubscription(tutor.userId, sinkKey);
    await installSinkPushManager(page.context(), `tutor-this-device-${tutor.userId}`);

    await page.goto("/profile");
    await page.getByRole("tab", { name: "Уведомления" }).click();
    const callSwitch = page.getByRole("checkbox", { name: "Уведомления о входящих звонках" });
    await expect(callSwitch).not.toBeChecked();
    await callSwitch.click();
    await expect(callSwitch).toBeChecked();
    await callSwitch.click();
    await expect(page.getByText("Настройки обновлены")).toBeVisible();
    await expect(callSwitch).not.toBeChecked();
    await page.goto("about:blank");
    await expect.poll(() => isTutorOnline(tutor.userId)).toBe(false);

    const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
    try {
      const studentPage = await studentContext.newPage();
      await seedStudentAuthInBrowser(studentPage, token);
      await studentPage.goto("/student/cabinet/schedule");

      await callTutorFromLesson(studentPage, "Физика");

      await expect(studentPage.getByText("Преподаватель сейчас не в сети")).toBeVisible();
      expect(await sinkPushes(sinkKey)).toEqual([]);
    } finally {
      await studentContext.close();
    }
  });
});
