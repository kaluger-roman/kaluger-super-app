import { test, expect } from "../fixtures";
import { createAndLoginTutor } from "../helpers/auth";
import { createLesson, createStudentFor, getLessonsFor } from "../helpers/db";

const HOUR_MS = 60 * 60 * 1000;
const BADGE_NAME = /^Не облагается налогом: доход по уроку не учитывается в сумме налога$/;

test.describe("Уроки без налога", { tag: ["@regression", "@lessons"] }, () => {
  test("учитель отмечает урок в попапе как не облагаемый налогом и видит значок в списке", async ({
    page,
  }) => {
    const { userId } = await createAndLoginTutor(page, { taxEnabled: true });
    const { student } = await createStudentFor(userId, { name: "Анна Благо", hourlyRate: 1500 });
    const start = new Date(Date.now() + 24 * HOUR_MS);
    await createLesson({
      tutorId: userId,
      studentId: student.id,
      startTime: start,
      endTime: new Date(start.getTime() + HOUR_MS),
      price: 1500,
    });

    await page.goto("/lessons");
    await page
      .getByRole("heading", { name: /Анна Благо/ })
      .first()
      .click();

    const viewDialog = page.getByRole("dialog").first();
    const taxSwitch = viewDialog.getByRole("switch", { name: "Не облагается налогом" });
    await expect(taxSwitch).not.toBeChecked();

    await taxSwitch.click();
    await expect(page.getByText("Урок обновлен")).toBeVisible();
    await expect(taxSwitch).toBeChecked();

    await page.keyboard.press("Escape");
    await expect(viewDialog).toBeHidden();

    const badge = page.getByRole("img", { name: BADGE_NAME });
    await expect(badge).toBeVisible();
    await badge.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      "Доход по уроку не учитывается в сумме налога"
    );

    await page
      .getByRole("heading", { name: /Анна Благо/ })
      .first()
      .click();
    await viewDialog.getByRole("switch", { name: "Не облагается налогом" }).click();
    await expect(
      viewDialog.getByRole("switch", { name: "Не облагается налогом" })
    ).not.toBeChecked();
    await page.keyboard.press("Escape");

    await expect(page.getByRole("img", { name: BADGE_NAME })).toHaveCount(0);
    const { lessons } = await getLessonsFor(userId);
    expect(lessons[0]!.isTaxExempt).toBe(false);
  });

  test("учитель создаёт урок с включённым переключателем и видит значок у урока", async ({
    page,
  }) => {
    const { userId } = await createAndLoginTutor(page, { taxEnabled: true });
    await createStudentFor(userId, { name: "Пётр Форма", hourlyRate: 1500 });

    await page.goto("/lessons");
    await page.getByRole("button", { name: "Создать урок" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Создать новый урок")).toBeVisible();
    await dialog.getByRole("combobox", { name: /Ученик/ }).click();
    await page.getByRole("option", { name: /Пётр Форма/ }).click();

    const taxSwitch = dialog.getByRole("switch", { name: "Не облагается налогом" });
    await expect(taxSwitch).not.toBeChecked();
    await taxSwitch.click();
    await expect(taxSwitch).toBeChecked();

    await dialog.getByRole("button", { name: "Создать урок" }).click();
    await expect(dialog).toBeHidden();

    await expect
      .poll(async () => (await getLessonsFor(userId)).lessons.map((l) => l.isTaxExempt))
      .toEqual([true]);
    await expect(page.getByRole("img", { name: BADGE_NAME }).first()).toBeVisible();
  });

  test("при выключенном учёте налога нет ни переключателя, ни значка", async ({ page }) => {
    const { userId } = await createAndLoginTutor(page, { taxEnabled: false });
    const { student } = await createStudentFor(userId, { name: "Олег Безналог" });
    const start = new Date(Date.now() + 24 * HOUR_MS);
    await createLesson({
      tutorId: userId,
      studentId: student.id,
      startTime: start,
      endTime: new Date(start.getTime() + HOUR_MS),
      price: 1500,
      isTaxExempt: true,
    });

    await page.goto("/lessons");
    await page
      .getByRole("heading", { name: /Олег Безналог/ })
      .first()
      .click();

    const viewDialog = page.getByRole("dialog").first();
    await expect(viewDialog.getByText("Урок", { exact: true })).toBeVisible();
    await expect(viewDialog.getByRole("switch", { name: "Не облагается налогом" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await expect(page.getByRole("img", { name: BADGE_NAME })).toHaveCount(0);
  });
});
