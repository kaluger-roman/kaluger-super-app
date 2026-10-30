import { test, expect } from "../fixtures";
import {
  confirmCall,
  isWebPushConfigured,
  seedSinkSubscription,
  sinkPushes,
} from "../helpers/call";
import { createStudentFor } from "../helpers/db";
import {
  isStudentOnline,
  registerStudentDirect,
  seedStudentAuthInBrowser,
} from "../helpers/student";

test.use({
  permissions: ["camera", "microphone"],
});

const CALL_ENDED_ELSEWHERE = "Звонок уже завершён";

test.describe(
  "Входящий звонок, когда приложение ученика закрыто",
  { tag: ["@regression", "@students"] },
  () => {
    test.beforeAll(async () => {
      if (!(await isWebPushConfigured())) {
        throw new Error(
          "E2E-бэкенд запущен без VAPID-ключей (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT): " +
            "push о звонке не уходит, сценарий проверить нельзя. Ключи: npx web-push generate-vapid-keys"
        );
      }
    });

    test("учитель звонит ученику с закрытым приложением: уходит push, ученик открывает его и принимает звонок", async ({
      page,
      tutor,
      browser,
    }) => {
      const studentName = "Вера Спящая";
      const { student } = await createStudentFor(tutor.userId, { name: studentName });
      const { token, studentUser } = await registerStudentDirect(student.id, {
        name: studentName,
        email: `student-push-${Date.now()}@e2e.local`,
        isEmailVerified: true,
      });
      const sinkKey = `student-${studentUser.id}`;
      await seedSinkSubscription(studentUser.id, sinkKey);
      expect(await isStudentOnline(studentUser.id)).toBe(false);

      await page.goto("/students");
      await page.getByText(studentName).click();
      await page.getByRole("dialog").getByRole("button", { name: "Видеозвонок" }).click();
      await confirmCall(page);

      await expect(page.getByText("Вызываем…")).toBeVisible();
      await expect(page.getByText("Ученик сейчас не в сети")).toBeHidden();
      await expect
        .poll(() => sinkPushes(sinkKey))
        .toEqual([
          expect.objectContaining({
            urgency: "high",
            ttl: "40",
            payload: expect.objectContaining({
              data: expect.objectContaining({ type: "incoming_call" }),
            }),
          }),
        ]);
      const [incomingPush] = await sinkPushes(sinkKey);

      const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
      try {
        const studentPage = await studentContext.newPage();
        await seedStudentAuthInBrowser(studentPage, token);
        await studentPage.goto(incomingPush.payload.data.url);

        await expect(studentPage.getByText("Входящий вызов")).toBeVisible();
        await expect(studentPage).toHaveURL(/\/student\/cabinet\/schedule$/);
        await studentPage.getByRole("button", { name: "Принять вызов" }).click();

        await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
        await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
        await expect(page.getByText("Соединение…")).toBeHidden();

        await page.getByRole("button", { name: "Завершить звонок" }).click();
        await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeHidden();
      } finally {
        await studentContext.close();
      }
    });

    test("ученик открывает уведомление о звонке, который уже закончился, и видит «Звонок уже завершён»", async ({
      tutor,
      browser,
    }) => {
      const studentName = "Пётр Опоздавший";
      const { student } = await createStudentFor(tutor.userId, { name: studentName });
      const { token } = await registerStudentDirect(student.id, {
        name: studentName,
        email: `student-stale-${Date.now()}@e2e.local`,
        isEmailVerified: true,
      });

      const studentContext = await browser.newContext({ permissions: ["camera", "microphone"] });
      try {
        const studentPage = await studentContext.newPage();
        await seedStudentAuthInBrowser(studentPage, token);
        await studentPage.goto(
          "/student/cabinet/schedule?call=00000000-0000-4000-8000-000000000000"
        );

        await expect(studentPage.getByText(CALL_ENDED_ELSEWHERE)).toBeVisible();
        await expect(studentPage.getByText("Входящий вызов")).toBeHidden();
        await expect(studentPage.getByText("Кабинет ученика")).toBeVisible();
      } finally {
        await studentContext.close();
      }
    });
  }
);
