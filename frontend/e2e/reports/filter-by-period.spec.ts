import { test, expect } from "../fixtures";
import { createStudentFor, createLesson } from "../helpers/db";
import { fillDatePicker } from "../helpers/datepicker";

const formatDdMmYyyy = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}${mm}${yyyy}`;
};

test.describe(
  "Фильтрация отчёта по периоду",
  { tag: ["@regression", "@reports"] },
  () => {
    test("данные пересчитываются после нажатия «Обновить» и отражают выбранный период", async ({
      page,
      tutor,
    }) => {
      const { userId } = tutor;
      const { student } = await createStudentFor(userId, {
        name: "Ученик Фильтр",
      });

      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(10, 0, 0, 0);

      const today = new Date(now);
      today.setHours(now.getHours() - 2, 0, 0, 0);

      await createLesson({
        tutorId: userId,
        studentId: student.id,
        startTime: sevenDaysAgo.toISOString(),
        endTime: new Date(
          sevenDaysAgo.getTime() + 60 * 60 * 1000,
        ).toISOString(),
        price: 1000,
        status: "COMPLETED",
        isPaid: true,
        paymentDate: sevenDaysAgo.toISOString(),
      });

      await createLesson({
        tutorId: userId,
        studentId: student.id,
        startTime: today.toISOString(),
        endTime: new Date(today.getTime() + 60 * 60 * 1000).toISOString(),
        price: 2000,
        status: "COMPLETED",
        isPaid: true,
        paymentDate: today.toISOString(),
      });

      await page.goto("/reports");
      await expect(
        page.getByRole("heading", { name: "Заработок" }),
      ).toBeVisible();

      const earningsAmount = page
        .getByRole("heading", { name: "Заработок" })
        .locator("xpath=following-sibling::*[1]");

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      await fillDatePicker(page, "Дата начала", formatDdMmYyyy(yesterday));
      await fillDatePicker(page, "Дата окончания", formatDdMmYyyy(tomorrow));

      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes("/api/statistics") &&
            !resp.url().includes("by-") &&
            resp.status() === 200,
        ),
        page.getByRole("button", { name: "Обновить" }).click(),
      ]);

      await expect(earningsAmount).toContainText(/2\s*000/);
    });
  },
);
