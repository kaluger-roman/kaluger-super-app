import { test, expect } from "../fixtures";
import { createAndLoginTutor } from "../helpers/auth";
import {
  createStudentFor,
  createLesson,
  setTaxPeriodsFor,
} from "../helpers/db";
import { fillDatePicker } from "../helpers/datepicker";

test.describe(
  "Расчёт налога с несколькими ставками",
  { tag: ["@regression", "@reports"] },
  () => {
    test("налоговый блок показывает корректную сумму при двух исторических ставках", async ({
      page,
    }) => {
      const { userId } = await createAndLoginTutor(page, { taxEnabled: true });

      await setTaxPeriodsFor(
        userId,
        [
          { startDate: "2026-01-01T00:00:00.000Z", rate: 4 },
          { startDate: "2026-04-01T00:00:00.000Z", rate: 6 },
        ],
        true,
      );

      const { student } = await createStudentFor(userId, {
        name: "Ученик Налог",
      });

      await createLesson({
        tutorId: userId,
        studentId: student.id,
        startTime: "2026-02-15T10:00:00.000Z",
        endTime: "2026-02-15T11:00:00.000Z",
        price: 1000,
        status: "COMPLETED",
        isPaid: true,
        paymentDate: "2026-02-15T10:00:00.000Z",
      });

      await createLesson({
        tutorId: userId,
        studentId: student.id,
        startTime: "2026-04-15T10:00:00.000Z",
        endTime: "2026-04-15T11:00:00.000Z",
        price: 1000,
        status: "COMPLETED",
        isPaid: true,
        paymentDate: "2026-04-15T10:00:00.000Z",
      });

      await page.goto("/reports");
      await expect(
        page.getByRole("heading", { name: "Заработок" }),
      ).toBeVisible();

      await fillDatePicker(page, "Дата начала", "01022026");
      await fillDatePicker(page, "Дата окончания", "30042026");

      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes("/api/statistics") &&
            !resp.url().includes("by-") &&
            resp.status() === 200,
        ),
        page.getByRole("button", { name: "Обновить" }).click(),
      ]);

      await expect(page.getByRole("heading", { name: /Налоги/ })).toBeVisible();

      const taxAmountEl = page
        .getByRole("heading", { name: /Налоги/ })
        .locator("xpath=following-sibling::*[1]");
      await expect(taxAmountEl).toContainText(/100/);
    });
  },
);
