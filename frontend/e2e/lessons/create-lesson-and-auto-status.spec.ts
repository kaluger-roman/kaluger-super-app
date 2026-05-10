import { test, expect } from "../fixtures";
import {
  createStudentFor,
  getLessonsFor,
  patchLesson,
  runLessonStatusTick,
} from "../helpers/db";

test.describe(
  "Создание урока и автоматическая смена статуса",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель создаёт урок через UI и видит автопереходы статуса по тику cron", async ({
      page,
      tutor,
    }) => {
      await createStudentFor(tutor.userId, {
        name: "Иван Иванов",
        hourlyRate: 1500,
      });

      await page.goto("/lessons");

      await page.getByRole("button", { name: "Создать урок" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Создать новый урок")).toBeVisible();

      await dialog.getByRole("combobox", { name: /Ученик/ }).click();
      await page.getByRole("option", { name: /Иван Иванов/ }).click();

      await dialog.getByRole("button", { name: "Создать урок" }).click();

      await expect(dialog).toBeHidden();

      const { lessons } = await getLessonsFor(tutor.userId);
      expect(lessons.length).toBeGreaterThan(0);
      const lessonId = lessons[0]!.id;

      const inProgressStart = new Date(Date.now() - 60 * 1000);
      const inProgressEnd = new Date(Date.now() + 59 * 60 * 1000);
      await patchLesson(lessonId, {
        startTime: inProgressStart,
        endTime: inProgressEnd,
        status: "SCHEDULED",
      });

      await runLessonStatusTick();
      await page.reload();

      await expect(
        page.getByText("В процессе", { exact: false }).first(),
      ).toBeVisible();

      const completedEnd = new Date(Date.now() - 60 * 1000);
      await patchLesson(lessonId, { endTime: completedEnd });

      await runLessonStatusTick();

      await expect
        .poll(async () => {
          const { lessons: result } = await getLessonsFor(tutor.userId);
          return result.find((l) => l.id === lessonId)?.status;
        })
        .toBe("COMPLETED");
    });
  },
);
