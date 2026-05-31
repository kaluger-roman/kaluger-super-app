import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, getLessonsFor } from "../helpers/db";
import { fillDateTimePicker } from "../helpers/datepicker";

const HOUR_MS = 60 * 60 * 1000;
const pad2 = (v: number): string => v.toString().padStart(2, "0");
const ddmmyyyy = (d: Date): string =>
  `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${d.getFullYear()}`;

test.describe("Перенос урока", { tag: ["@regression", "@lessons"] }, () => {
  test("учитель переносит урок на другое время и оно сохраняется со статусом RESCHEDULED", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Олег Орлов",
      hourlyRate: 1500,
    });

    const original = new Date();
    original.setDate(original.getDate() + 3);
    original.setHours(10, 0, 0, 0);

    const { lesson } = await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: original,
      endTime: new Date(original.getTime() + HOUR_MS),
      price: 1500,
      status: "SCHEDULED",
    });

    await page.goto("/lessons");
    await page.getByRole("heading", { name: /Олег Орлов/ }).first().click();

    const viewDialog = page.getByRole("dialog").first();
    await viewDialog.getByRole("button", { name: "Перенести" }).click();

    const datePart = ddmmyyyy(original);
    await fillDateTimePicker(page, "Новое время начала", `${datePart}1500`);
    await fillDateTimePicker(page, "Новое время окончания", `${datePart}1600`);

    await page.getByRole("button", { name: "Перенести урок" }).click();

    await expect
      .poll(async () => {
        const { lessons } = await getLessonsFor(tutor.userId);
        const updated = lessons.find((l) => l.id === lesson.id);
        return {
          status: updated?.status,
          hour: updated ? new Date(updated.startTime).getHours() : null,
        };
      })
      .toEqual({ status: "RESCHEDULED", hour: 15 });
  });
});
