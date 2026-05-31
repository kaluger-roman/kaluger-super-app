import { test, expect } from "../fixtures";
import { createLesson, createStudentFor, createVerifiedUser } from "../helpers/db";
import { generateCredentials } from "../helpers/auth";
import {
  currentWeekSlot,
  nextWeekSlot,
  registerStudentDirect,
  seedStudentAuthInBrowser,
} from "../helpers/student";

test.describe(
  "Ученик видит своё расписание в кабинете",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("ученик видит свой урок и не видит урок чужого ученика", async ({
      page,
    }) => {
      const { user: tutorA } = await createVerifiedUser(
        generateCredentials("tutorA"),
      );
      const { student: studentA } = await createStudentFor(tutorA.id, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });
      const ownSlot = currentWeekSlot(12);
      await createLesson({
        tutorId: tutorA.id,
        studentId: studentA.id,
        startTime: ownSlot.start,
        endTime: ownSlot.end,
        subject: "MATHEMATICS",
        status: "SCHEDULED",
      });

      const { user: tutorB } = await createVerifiedUser(
        generateCredentials("tutorB"),
      );
      const { student: studentB } = await createStudentFor(tutorB.id, {
        name: "Чужой Ученик",
        hourlyRate: 1500,
      });
      const otherSlot = currentWeekSlot(14);
      await createLesson({
        tutorId: tutorB.id,
        studentId: studentB.id,
        startTime: otherSlot.start,
        endTime: otherSlot.end,
        subject: "PHYSICS",
        status: "SCHEDULED",
      });

      const registered = await registerStudentDirect(studentA.id, {
        name: "Пётр Сидоров",
        email: `student-${Date.now()}@e2e.local`,
        isEmailVerified: true,
      });
      await seedStudentAuthInBrowser(page, registered.token);

      await page.goto("/student/cabinet/schedule");

      await expect(page.getByText("Математика")).toBeVisible();
      await expect(page.getByText("Физика")).toHaveCount(0);
    });

    test("ученик переключает неделю вперёд и видит урок следующей недели", async ({
      page,
    }) => {
      const { user: tutor } = await createVerifiedUser(
        generateCredentials("tutor"),
      );
      const { student } = await createStudentFor(tutor.id, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });

      const thisWeek = currentWeekSlot(12);
      await createLesson({
        tutorId: tutor.id,
        studentId: student.id,
        startTime: thisWeek.start,
        endTime: thisWeek.end,
        subject: "MATHEMATICS",
        status: "SCHEDULED",
      });

      const nextWeek = nextWeekSlot(12);
      await createLesson({
        tutorId: tutor.id,
        studentId: student.id,
        startTime: nextWeek.start,
        endTime: nextWeek.end,
        subject: "PHYSICS",
        status: "SCHEDULED",
      });

      const registered = await registerStudentDirect(student.id, {
        name: "Пётр Сидоров",
        email: `student-${Date.now()}@e2e.local`,
        isEmailVerified: true,
      });
      await seedStudentAuthInBrowser(page, registered.token);

      await page.goto("/student/cabinet/schedule");
      await expect(page.getByText("Математика")).toBeVisible();

      await page.getByRole("button", { name: "Вперёд" }).click();

      await expect(page.getByText("Физика")).toBeVisible();
      await expect(page.getByText("Математика")).toHaveCount(0);
    });
  },
);
