import { test, expect } from "../fixtures";
import { fillDatePicker, formatDdMmYyyy } from "../helpers/datepicker";
import { createLesson, createStudentFor } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;

test.describe("Комиссии в статистике доходов", { tag: ["@regression", "@reports"] }, () => {
  test("учитель видит списания за период, неизменный заработок и общий остаток", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Статистика Комиссии",
      hourlyRate: 1500,
      commissionAmount: 3000,
    });

    const now = new Date();
    for (let index = 0; index < 2; index += 1) {
      const start = new Date(now.getFullYear(), now.getMonth(), 2 + index, 10, 0, 0);
      await createLesson({
        tutorId: tutor.userId,
        studentId: student.id,
        startTime: start,
        endTime: new Date(start.getTime() + HOUR_MS),
        price: 1500,
        status: "COMPLETED",
        isPaid: true,
        paymentDate: start,
      });
    }

    await page.goto("/reports");

    const earnings = page.getByTestId("earnings");
    await expect(earnings).toContainText(/3\s*000/);

    const writtenOff = page.getByTestId("commission-written-off");
    await expect(writtenOff).toContainText(/3\s*000/);

    await expect(page.getByText("Не зависит от выбранного периода")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Предоплата" })).toBeVisible();

    const remaining = page.getByTestId("commission-remaining-total");
    await expect(remaining).toContainText("0");
  });

  test("общий остаток не меняется при смене периода, а списания пересчитываются", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Остаток Комиссии",
      hourlyRate: 1200,
      commissionAmount: 5000,
    });

    const now = new Date();
    const lastMonthLesson = new Date(now.getFullYear(), now.getMonth() - 1, 15, 10, 0, 0);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: lastMonthLesson,
      endTime: new Date(lastMonthLesson.getTime() + HOUR_MS),
      price: 1200,
      status: "COMPLETED",
      isPaid: true,
      paymentDate: lastMonthLesson,
    });

    await page.goto("/reports");

    const remaining = page.getByTestId("commission-remaining-total");
    const writtenOff = page.getByTestId("commission-written-off");

    await expect(remaining).toContainText(/3\s*800/);
    await expect(writtenOff).toContainText("0 ₽");

    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    await fillDatePicker(page, "Дата начала", formatDdMmYyyy(periodStart));
    await fillDatePicker(page, "Дата окончания", formatDdMmYyyy(periodEnd));

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/statistics") &&
          !resp.url().includes("by-") &&
          resp.status() === 200
      ),
      page.getByRole("button", { name: "Обновить" }).click(),
    ]);

    await expect(writtenOff).toContainText(/1\s*200/);
    await expect(remaining).toContainText(/3\s*800/);
  });

  test("у учителя без комиссий показателей про комиссии нет, а группа снимков остаётся", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Без Комиссий",
      hourlyRate: 1000,
    });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 4, 10, 0, 0);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: start,
      endTime: new Date(start.getTime() + HOUR_MS),
      price: 1000,
      status: "COMPLETED",
      isPaid: true,
      paymentDate: start,
    });

    await page.goto("/reports");

    await expect(page.getByRole("heading", { name: "Заработок" })).toBeVisible();
    await expect(page.getByText("Не зависит от выбранного периода")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Предоплата" })).toBeVisible();
    await expect(page.getByText(/комисси/i)).toHaveCount(0);
  });
});
