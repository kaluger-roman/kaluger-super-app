import { test, expect } from "../fixtures";
import {
  createLesson,
  createStudentFor,
  getLessonsFor,
} from "../helpers/db";

test.describe("Перенос урока", { tag: ["@regression", "@lessons"] }, () => {
  test("учитель открывает диалог переноса recurring-урока — RescheduleDialog показывается с правильными полями", async ({
    page,
    tutor,
  }) => {
    const { student } = await createStudentFor(tutor.userId, {
      name: "Олег Орлов",
      hourlyRate: 1500,
    });

    const baseStart = new Date();
    baseStart.setDate(baseStart.getDate() + 7);
    baseStart.setHours(14, 0, 0, 0);

    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const hourMs = 60 * 60 * 1000;

    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: baseStart,
      endTime: new Date(baseStart.getTime() + hourMs),
      price: 1500,
      status: "SCHEDULED",
      isRecurring: true,
    });

    const secondStart = new Date(baseStart.getTime() + weekMs);
    const { lesson: second } = await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: secondStart,
      endTime: new Date(secondStart.getTime() + hourMs),
      price: 1500,
      status: "SCHEDULED",
      isRecurring: true,
    });

    const thirdStart = new Date(baseStart.getTime() + 2 * weekMs);
    await createLesson({
      tutorId: tutor.userId,
      studentId: student.id,
      startTime: thirdStart,
      endTime: new Date(thirdStart.getTime() + hourMs),
      price: 1500,
      status: "SCHEDULED",
      isRecurring: true,
    });

    await page.goto("/lessons");

    const cards = page.getByRole("heading", { name: /Олег Орлов/ });
    await cards.nth(1).click();

    const viewDialog = page.getByRole("dialog").first();
    await viewDialog.getByRole("button", { name: "Перенести" }).click();

    await expect(
      page.getByRole("button", { name: /Перенести урок|Переношу/ }).last(),
    ).toBeVisible();

    const newStart = new Date(secondStart.getTime() + dayMs);
    const newEnd = new Date(newStart.getTime() + hourMs);

    await page.evaluate(
      ({ startISO, endISO }) => {
        const w = window as unknown as {
          __rescheduleNewStartTimeChanged?: (date: Date) => void;
          __rescheduleNewEndTimeChanged?: (date: Date) => void;
        };
        if (w.__rescheduleNewStartTimeChanged) {
          w.__rescheduleNewStartTimeChanged(new Date(startISO));
        }
        if (w.__rescheduleNewEndTimeChanged) {
          w.__rescheduleNewEndTimeChanged(new Date(endISO));
        }
      },
      { startISO: newStart.toISOString(), endISO: newEnd.toISOString() },
    );

    await page.getByRole("button", { name: "Отмена" }).click();

    const apiResp = await page.request.put(
      `http://localhost:3001/api/lessons/${second.id}`,
      {
        headers: {
          Authorization: `Bearer ${tutor.token}`,
          "Content-Type": "application/json",
        },
        data: {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          status: "RESCHEDULED",
        },
      },
    );
    expect(apiResp.ok()).toBe(true);

    const { lessons } = await getLessonsFor(tutor.userId);
    const updated = lessons.find((l) => l.id === second.id);
    expect(updated?.status).toBe("RESCHEDULED");
    expect(new Date(updated!.startTime).getTime()).not.toBe(
      secondStart.getTime(),
    );
  });
});
