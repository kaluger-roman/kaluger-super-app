import { test, expect } from "../fixtures";
import { createLesson, createStudentFor } from "../helpers/db";

const makeFutureSlot = (daysAhead: number): { start: Date; end: Date } => {
  const start = new Date();
  start.setDate(start.getDate() + daysAhead);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
};

test.describe("Обзор дашборда", { tag: ["@regression", "@dashboard"] }, () => {
  test("учитель видит ближайшие уроки и обзор учеников после загрузки", async ({
    page,
    tutor,
  }) => {
    const { student: studentA } = await createStudentFor(tutor.userId, {
      name: "Алексей Смирнов",
    });
    const { student: studentB } = await createStudentFor(tutor.userId, {
      name: "Мария Иванова",
    });

    const slot1 = makeFutureSlot(1);
    const slot2 = makeFutureSlot(2);

    await createLesson({
      tutorId: tutor.userId,
      studentId: studentA.id,
      startTime: slot1.start,
      endTime: slot1.end,
      status: "SCHEDULED",
    });
    await createLesson({
      tutorId: tutor.userId,
      studentId: studentB.id,
      startTime: slot2.start,
      endTime: slot2.end,
      status: "SCHEDULED",
    });

    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /Посмотреть все уроки/ }),
    ).toBeVisible();
    await expect(page.getByText("Алексей Смирнов").first()).toBeVisible();
    await expect(page.getByText("Мария Иванова").first()).toBeVisible();

    await expect(
      page.getByRole("button", { name: /Посмотреть всех учеников/ }),
    ).toBeVisible();
  });

  test("учитель кликает «Ученики» в QuickActions и попадает на список учеников", async ({
    page,
    tutor,
  }) => {
    await createStudentFor(tutor.userId, { name: "Демо Ученик" });

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /Посмотреть всех учеников/ }),
    ).toBeVisible();

    await page.getByRole("heading", { name: "Ученики", exact: true }).click();

    await expect(page).toHaveURL(/\/students$/);
  });
});
