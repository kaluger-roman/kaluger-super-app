import { test, expect } from "../fixtures";
import { createStudentFor, createLesson } from "../helpers/db";

test.describe(
  "Ежемесячный финансовый отчёт",
  { tag: ["@regression", "@reports"] },
  () => {
    test("учитель видит корректный заработок и задолженность за текущий месяц", async ({
      page,
      tutor,
    }) => {
      const { userId } = tutor;
      const { student } = await createStudentFor(userId, {
        name: "Ученик Отчёт",
      });

      const now = new Date();
      const hourMs = 60 * 60 * 1000;

      for (let i = 0; i < 3; i += 1) {
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          2 + i,
          10,
          0,
          0,
        );
        await createLesson({
          tutorId: userId,
          studentId: student.id,
          startTime: start.toISOString(),
          endTime: new Date(start.getTime() + hourMs).toISOString(),
          price: 1500,
          status: "COMPLETED",
          isPaid: true,
          paymentDate: start.toISOString(),
        });
      }

      const unpaidStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        5,
        14,
        0,
        0,
      );
      await createLesson({
        tutorId: userId,
        studentId: student.id,
        startTime: unpaidStart.toISOString(),
        endTime: new Date(unpaidStart.getTime() + hourMs).toISOString(),
        price: 2000,
        status: "COMPLETED",
        isPaid: false,
      });

      await page.goto("/reports");
      await expect(
        page.getByRole("heading", { name: "Заработок" }),
      ).toBeVisible();

      const earningsAmount = page
        .getByRole("heading", { name: "Заработок" })
        .locator("xpath=following-sibling::*[1]");
      await expect(earningsAmount).toContainText(/4\s*500/);

      await expect(page.getByText(/2\s*000/).first()).toBeVisible();
    });
  },
);
