import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, getLessonsFor } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;

test.describe("Полученная сумма за урок", { tag: ["@regression", "@lessons"] }, () => {
  test("учитель отмечает оплату с другой полученной суммой и исправляет её в форме", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Мария Петрова" });
    const start = new Date(Date.now() - 24 * HOUR_MS);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: start,
      endTime: new Date(start.getTime() + HOUR_MS),
      status: "COMPLETED",
      isPaid: false,
      price: 2000,
    });

    await page.goto("/lessons");
    await page.getByRole("tab", { name: "Прошедшие" }).click();
    await page
      .getByRole("heading", { name: /Мария Петрова/ })
      .first()
      .click();

    const viewDialog = page.getByRole("dialog").first();
    await viewDialog.getByLabel("Не оплачено").click();

    const paidDialog = page.getByRole("dialog", { name: "Отметить как оплачено" });
    const receivedField = paidDialog.getByLabel("Получено (₽)");
    await expect(receivedField).toHaveValue("2000");
    await receivedField.fill("1800");
    await paidDialog.getByRole("button", { name: "Подтвердить" }).click();
    await expect(paidDialog).toBeHidden();

    await expect(viewDialog.getByLabel("Оплачено")).toBeVisible();
    await expect(viewDialog.getByText(/получено 1\s800/)).toBeVisible();

    const { lessons: paidLessons } = await getLessonsFor(tutor.userId);
    const paymentDate = paidLessons[0]!.paymentDate;
    expect(Number(paidLessons[0]!.receivedAmount)).toBe(1800);

    await viewDialog.getByRole("button", { name: "Редактировать" }).click();
    const formDialog = page.getByRole("dialog").last();
    const formReceivedField = formDialog.getByLabel("Получено (₽)");
    await expect(formReceivedField).toHaveValue("1800");
    await formReceivedField.fill("2000");
    await formDialog.getByRole("button", { name: "Обновить урок" }).click();

    await expect
      .poll(async () => {
        const { lessons } = await getLessonsFor(tutor.userId);
        return Number(lessons[0]!.receivedAmount);
      })
      .toBe(2000);
    const { lessons } = await getLessonsFor(tutor.userId);
    expect(lessons[0]!.isPaid).toBe(true);
    expect(lessons[0]!.paymentDate).toBe(paymentDate);

    await expect(formDialog).toBeHidden();
    await page
      .getByRole("heading", { name: /Мария Петрова/ })
      .first()
      .click();
    await expect(page.getByRole("dialog").first().getByLabel("Оплачено")).toBeVisible();
    await expect(
      page
        .getByRole("dialog")
        .first()
        .getByText(/получено/)
    ).toHaveCount(0);
  });
});
