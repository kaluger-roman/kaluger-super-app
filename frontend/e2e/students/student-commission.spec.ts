import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, getStudentsFor } from "../helpers/db";

test.describe("Комиссия ученика", { tag: ["@regression", "@students"] }, () => {
  test("учитель задаёт комиссию при создании и видит её при повторном открытии формы", async ({
    page,
    tutor,
  }) => {
    await page.goto("/students");
    await expect(page.getByRole("tab", { name: "Активные" })).toBeVisible();

    await page.getByRole("button", { name: "Добавить ученика" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Имя ученика").fill("Комиссионный Ученик");
    await dialog.getByLabel("Комиссия").fill("3000");
    await dialog.getByRole("button", { name: "Добавить" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Комиссионный Ученик")).toBeVisible();

    const { students } = await getStudentsFor(tutor.userId);
    const created = students.find((s) => s.name === "Комиссионный Ученик");
    expect(created?.commissionAmount).toBe(3000);

    await page.getByText("Комиссионный Ученик").click();
    const viewDialog = page.getByRole("dialog");
    await viewDialog.getByRole("button", { name: "Редактировать" }).click();

    const editDialog = page.getByRole("dialog");
    await expect(editDialog.getByLabel("Комиссия")).toHaveValue("3000");
  });

  test("учитель пытается сохранить отрицательную комиссию и сохранение не происходит", async ({
    page,
    tutor,
  }) => {
    await page.goto("/students");
    await expect(page.getByRole("tab", { name: "Активные" })).toBeVisible();

    await page.getByRole("button", { name: "Добавить ученика" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Имя ученика").fill("Минусовый Ученик");
    await dialog.getByLabel("Комиссия").fill("-500");

    await expect(dialog.getByText("Комиссия не может быть отрицательной")).toBeVisible();

    await dialog.getByRole("button", { name: "Добавить" }).click();

    await expect(dialog).toBeVisible();

    const { students } = await getStudentsFor(tutor.userId);
    expect(students.some((s) => s.name === "Минусовый Ученик")).toBe(false);
  });

  test("учитель видит прогресс погашения комиссии в карточке ученика", async ({ page, tutor }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Прогресс Комиссии",
      hourlyRate: 1200,
      commissionAmount: 3000,
    });

    const start = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: start,
      endTime: new Date(start.getTime() + 60 * 60 * 1000),
      price: 1200,
      status: "COMPLETED",
      isPaid: true,
      paymentDate: start,
    });

    await page.goto("/students");

    await expect(page.getByText(/Комиссия .* · погашено .* · осталось/)).toBeVisible();
    await expect(page.getByText(/осталось\s*1\s*800/)).toBeVisible();
  });
});
