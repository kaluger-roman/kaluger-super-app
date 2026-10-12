import type { Page } from "@playwright/test";

import { test, expect } from "../fixtures";
import { fillDatePicker, formatDdMmYyyy } from "../helpers/datepicker";
import { createLesson, createStudentFor } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;

const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
};

const seedPayment = (
  tutorId: string,
  studentId: string,
  day: Date,
  price: number,
  receivedAmount?: number
) =>
  createLesson({
    tutorId,
    studentId,
    startTime: day,
    endTime: new Date(day.getTime() + HOUR_MS),
    price,
    status: "COMPLETED",
    isPaid: true,
    paymentDate: day,
    receivedAmount,
  });

const applyPeriod = async (page: Page, startDate: Date) => {
  await expect(page.getByRole("heading", { name: "Заработок" })).toBeVisible();
  await fillDatePicker(page, "Дата начала", formatDdMmYyyy(startDate));
  await fillDatePicker(page, "Дата окончания", formatDdMmYyyy(new Date()));
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes("/api/statistics/income-history") && resp.status() === 200
    ),
    page.getByRole("button", { name: "Обновить" }).click(),
  ]);
};

test.describe("История поступлений", { tag: ["@regression", "@reports"] }, () => {
  test("учитель сверяет историю с карточкой, открывает урок из строки и снимает оплату", async ({
    page,
    tutor,
  }) => {
    const { student: anna } = await createStudentFor(tutor.userId, { name: "Анна Смирнова" });
    const { student: boris } = await createStudentFor(tutor.userId, { name: "Борис Петров" });
    await seedPayment(tutor.userId, anna.id, daysAgo(3), 1500);
    await seedPayment(tutor.userId, boris.id, daysAgo(3), 2000, 1800);
    await seedPayment(tutor.userId, anna.id, daysAgo(1), 1000);

    await page.goto("/reports");
    await expect(page.getByRole("tab", { name: "Сводка" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await applyPeriod(page, daysAgo(5));

    await expect(page.getByTestId("payments-in-range")).toHaveText(/^4\s300\s₽$/);
    await expect(
      page.getByText("Фактические поступления (3 оплаты по дате платежа)")
    ).toBeVisible();

    await page.getByRole("button", { name: "История поступлений по дням" }).click();

    const historyTab = page.getByRole("tab", { name: "История поступлений" });
    await expect(historyTab).toHaveAttribute("aria-selected", "true");
    const history = page.getByRole("region", { name: "История поступлений" });
    await expect(history.getByTestId("income-history-total")).toHaveText(/^4\s300(,00)?\s₽$/);
    await expect(history.getByRole("region")).toHaveCount(2);
    await expect(history.getByRole("button", { name: /Анна Смирнова/ })).toHaveCount(2);

    await history.getByRole("button", { name: /Борис Петров/ }).click();

    const viewDialog = page.getByRole("dialog").first();
    await expect(viewDialog.getByText("Борис Петров")).toBeVisible();
    await expect(viewDialog.getByText(/получено 1\s800/)).toBeVisible();

    await viewDialog.getByLabel("Оплачено").click();
    const unpaidDialog = page.getByRole("dialog", { name: "Отметить как неоплачено" });
    await unpaidDialog.getByRole("button", { name: "Подтвердить" }).click();
    await expect(unpaidDialog).toBeHidden();
    await expect(viewDialog.getByLabel("Не оплачено")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewDialog).toBeHidden();

    await expect(history.getByRole("button", { name: /Борис Петров/ })).toHaveCount(0);
    await expect(history.getByTestId("income-history-total")).toHaveText(/^2\s500(,00)?\s₽$/);
    await expect(historyTab).toHaveAttribute("aria-selected", "true");

    await page.getByRole("tab", { name: "Сводка" }).click();
    await expect(page.getByTestId("payments-in-range")).toHaveText(/^2\s500\s₽$/);
  });

  test("учитель догружает старые оплаты кнопкой «Показать ещё»", async ({ page, tutor }) => {
    const { student } = await createStudentFor(tutor.userId, { name: "Вера Иванова" });
    for (let day = 1; day <= 60; day += 1) {
      await seedPayment(tutor.userId, student.id, daysAgo(day), 1000);
    }

    await page.goto("/reports");
    await applyPeriod(page, daysAgo(61));
    await page.getByRole("tab", { name: "История поступлений" }).click();

    const history = page.getByRole("region", { name: "История поступлений" });
    await expect(history.getByRole("region")).toHaveCount(50);
    const loadMore = history.getByRole("button", { name: "Показать ещё (осталось 10)" });
    await loadMore.click();

    await expect(history.getByRole("region")).toHaveCount(60);
    await expect(history.getByRole("button", { name: /Показать ещё/ })).toHaveCount(0);
    await expect(history.getByTestId("income-history-total")).toHaveText(/^60\s000(,00)?\s₽$/);
  });
});
