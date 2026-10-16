import { test, expect } from "../fixtures";
import { createAndLoginTutor } from "../helpers/auth";
import { fillDatePicker } from "../helpers/datepicker";
import { createLesson, createStudentFor, setTaxPeriodsFor } from "../helpers/db";

test.describe("Налог без необлагаемых уроков", { tag: ["@regression", "@reports"] }, () => {
  test("учитель видит налог только по облагаемым оплатам и сумму необлагаемых в подсказке", async ({
    page,
  }) => {
    const { userId } = await createAndLoginTutor(page, { taxEnabled: true });
    await setTaxPeriodsFor(userId, [{ startDate: "2026-01-01T00:00:00.000Z", rate: 6 }], true);
    const { student } = await createStudentFor(userId, { name: "Ученик Налог" });

    for (const [day, price, isTaxExempt] of [
      [10, 1000, false],
      [12, 2000, true],
    ] as const) {
      const start = `2026-02-${day}T10:00:00.000Z`;
      await createLesson({
        tutorId: userId,
        studentId: student.id,
        startTime: start,
        endTime: `2026-02-${day}T11:00:00.000Z`,
        price,
        status: "COMPLETED",
        isPaid: true,
        paymentDate: start,
        isTaxExempt,
      });
    }

    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Заработок" })).toBeVisible();

    await fillDatePicker(page, "Дата начала", "01022026");
    await fillDatePicker(page, "Дата окончания", "28022026");
    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/statistics") &&
          !resp.url().includes("by-") &&
          resp.status() === 200
      ),
      page.getByRole("button", { name: "Обновить" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: /^Налоги \(6%\)/ })).toBeVisible();
    await expect(page.getByTestId("tax-amount")).toContainText(/60\s₽/);
    await expect(page.getByTestId("payments-in-range")).toContainText(/3\s000\s₽/);

    await page.getByRole("button", { name: "Подробности расчёта налога" }).hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText(
      /6%\s×\s1\s000\s₽\s=\s60\s₽\s*Не облагается налогом:\s2\s000\s₽/
    );
  });
});
