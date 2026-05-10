import { test, expect } from "../fixtures";
import { createLesson, createStudentFor } from "../helpers/db";

test.use({
  permissions: ["notifications"],
  serviceWorkers: "allow",
});

test.describe(
  "Push-подписка на напоминания об уроках",
  { tag: ["@regression", "@pwa"] },
  () => {
    test("учитель открывает раздел уведомлений в профиле и видит настройки напоминаний", async ({
      page,
      tutor,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Студент напоминаний",
        hourlyRate: 1500,
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(11, 0, 0, 0);

      await createLesson({
        tutorId: tutor.userId,
        studentId: student.id,
        startTime: tomorrow,
        endTime: tomorrowEnd,
        status: "SCHEDULED",
        price: 1500,
      });

      await page.goto("/profile");

      const notificationsTab = page.getByRole("tab", { name: "Уведомления" });
      if (await notificationsTab.isVisible().catch(() => false)) {
        await notificationsTab.click();
      }

      await expect(page.getByText(/Напоминания об уроках/i)).toBeVisible();
    });

    test.skip(
      "учитель включает напоминания — подписка создаётся в БД, reminders планируются",
      async () => {
        // craco start не регистрирует Service Worker в development.
        // Полный flow требует HTTPS-проекта + addInitScript-мока pushManager.
      },
    );
  },
);
