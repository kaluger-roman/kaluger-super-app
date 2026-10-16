import { test, expect } from "../fixtures";
import { createLesson, createStudentFor } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;

test.describe("Зачёт уроков в счёт комиссии", { tag: ["@regression", "@lessons"] }, () => {
  test("учитель видит фактические пометки у оплаченных уроков и их отсутствие после погашения", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Комиссия Фактом",
      hourlyRate: 1000,
      commissionAmount: 2500,
    });

    for (let index = 0; index < 4; index += 1) {
      const start = new Date(Date.now() - (10 - index) * 24 * HOUR_MS);
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
    }

    await page.goto("/lessons");
    await page.getByRole("tab", { name: "Прошедшие" }).click();

    await expect(page.getByLabel(/Зачтено в счёт комиссии/).first()).toBeVisible();
    await expect(page.getByLabel(/Зачтено в счёт комиссии/)).toHaveCount(3);
  });

  test("учитель отмечает урок оплаченным и предварительная пометка становится фактической", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Комиссия Прогнозом",
      hourlyRate: 1000,
      commissionAmount: 2000,
    });

    const start = new Date(Date.now() - 24 * HOUR_MS);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: start,
      endTime: new Date(start.getTime() + HOUR_MS),
      price: 1000,
      status: "COMPLETED",
      isPaid: false,
    });

    await page.goto("/lessons");
    await page.getByRole("tab", { name: "Прошедшие" }).click();

    await expect(page.getByLabel(/Предварительно пойдёт в счёт комиссии/)).toBeVisible();

    await page
      .getByRole("heading", { name: /Комиссия Прогнозом/ })
      .first()
      .click();

    const viewDialog = page.getByRole("dialog").first();
    await viewDialog.getByLabel("Не оплачено").click();

    const confirmDialog = page.getByRole("dialog", { name: "Отметить как оплачено" });
    await confirmDialog.getByRole("button", { name: "Подтвердить" }).click();
    await expect(confirmDialog).toBeHidden();

    await expect(viewDialog.getByLabel(/Зачтено в счёт комиссии/)).toBeVisible();
  });

  test("у ученика без комиссии пометок на уроках нет", async ({ page, tutor }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Без Комиссии",
      hourlyRate: 1000,
    });

    const start = new Date(Date.now() - 24 * HOUR_MS);
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

    await page.goto("/lessons");
    await page.getByRole("tab", { name: "Прошедшие" }).click();

    await expect(page.getByRole("heading", { name: /Без Комиссии/ }).first()).toBeVisible();
    await expect(page.getByLabel(/в счёт комиссии/)).toHaveCount(0);
  });
});
