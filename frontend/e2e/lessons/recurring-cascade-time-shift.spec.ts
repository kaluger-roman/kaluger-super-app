import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, getLessonsFor } from "../helpers/db";
import { fillDateTimePicker } from "../helpers/datepicker";

const HOUR_MS = 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * HOUR_MS;

const pad2 = (value: number): string => value.toString().padStart(2, "0");

const formatDdMmYyyyHhMm = (date: Date): string =>
  `${pad2(date.getDate())}${pad2(date.getMonth() + 1)}${date.getFullYear()}${pad2(
    date.getHours(),
  )}${pad2(date.getMinutes())}`;

test.describe(
  "Каскадный сдвиг серии recurring при смене времени",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель меняет время одного recurring-урока, подтверждает диалог — вся серия сдвигается на ту же дельту", async ({
      page,
      tutor,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Илья Иванов",
        hourlyRate: 1500,
      });

      // Ближайший понедельник через две недели в 14:00 локального времени —
      // буфер исключает риск, что cron-обработчик статусов переведёт первый
      // урок в IN_PROGRESS до того, как тест успеет открыть форму.
      const baseStart = new Date();
      baseStart.setDate(baseStart.getDate() + 14);
      const daysUntilMonday = (8 - baseStart.getDay()) % 7;
      baseStart.setDate(baseStart.getDate() + daysUntilMonday);
      baseStart.setHours(14, 0, 0, 0);

      const createRecurring = async (offsetMs: number) =>
        createLesson({
          tutorId: tutor.userId,
          studentId: student.id,
          startTime: new Date(baseStart.getTime() + offsetMs),
          endTime: new Date(baseStart.getTime() + offsetMs + HOUR_MS),
          price: 1500,
          status: "SCHEDULED",
          isRecurring: true,
        });

      const { lesson: first } = await createRecurring(0);
      const { lesson: second } = await createRecurring(WEEK_MS);
      const { lesson: third } = await createRecurring(2 * WEEK_MS);

      await page.goto("/lessons");

      await page.getByRole("heading", { name: /Илья Иванов/ }).first().click();

      const viewDialog = page.getByRole("dialog").first();
      await viewDialog
        .getByRole("button", { name: "Редактировать" })
        .click();

      const formDialog = page.getByRole("dialog").last();
      await expect(
        formDialog.getByText("Редактировать урок"),
      ).toBeVisible();

      const newStart = new Date(baseStart.getTime() + HOUR_MS);
      const newEnd = new Date(newStart.getTime() + HOUR_MS);

      await fillDateTimePicker(
        page,
        "Время начала",
        formatDdMmYyyyHhMm(newStart),
      );
      await fillDateTimePicker(
        page,
        "Время окончания",
        formatDdMmYyyyHhMm(newEnd),
      );

      await formDialog
        .getByRole("button", { name: "Обновить урок" })
        .click();

      const confirmDialog = page.getByRole("dialog").last();
      await expect(
        confirmDialog.getByText("Изменение времени регулярного урока"),
      ).toBeVisible();

      await confirmDialog
        .getByRole("button", { name: "Подтвердить" })
        .click();

      const expectedStartByLessonId = new Map([
        [first.id, newStart.toISOString()],
        [second.id, new Date(newStart.getTime() + WEEK_MS).toISOString()],
        [third.id, new Date(newStart.getTime() + 2 * WEEK_MS).toISOString()],
      ]);

      await expect
        .poll(
          async () => {
            const { lessons } = await getLessonsFor(tutor.userId);
            return lessons
              .filter((l) => expectedStartByLessonId.has(l.id))
              .every(
                (l) =>
                  new Date(l.startTime).toISOString() ===
                  expectedStartByLessonId.get(l.id),
              );
          },
          { timeout: 10_000 },
        )
        .toBe(true);
    });
  },
);
