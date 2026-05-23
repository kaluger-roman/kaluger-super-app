import { test, expect } from "../fixtures";
import {
  createLesson,
  createStudentFor,
  patchLesson,
  runLessonStatusTick,
} from "../helpers/db";

test.describe(
  "Обновление статуса урока через WebSocket в реальном времени",
  { tag: ["@regression", "@pwa"] },
  () => {
    test("статус урока меняется на «В процессе» после cron-тика без перезагрузки страницы", async ({
      page,
      tutor,
    }) => {
      const { student } = await createStudentFor(tutor.userId, {
        name: "Студент WS-теста",
        hourlyRate: 2000,
      });

      const now = new Date();
      const startTime = new Date(now.getTime() + 5 * 60 * 1000);
      const endTime = new Date(now.getTime() + 65 * 60 * 1000);

      const { lesson } = await createLesson({
        tutorId: tutor.userId,
        studentId: student.id,
        startTime,
        endTime,
        status: "SCHEDULED",
        price: 2000,
      });

      await page.goto("/lessons");

      await expect(
        page.getByText(/Запланирован/i).first(),
      ).toBeVisible({ timeout: 10_000 });

      const pastStart = new Date(now.getTime() - 60 * 1000);
      const futureEnd = new Date(now.getTime() + 60 * 60 * 1000);

      await patchLesson(lesson.id, {
        startTime: pastStart,
        endTime: futureEnd,
      });

      await runLessonStatusTick();

      await expect(
        page.getByText(/В процессе|Идёт сейчас/).first(),
      ).toBeVisible({ timeout: 15_000 });
    });
  },
);
