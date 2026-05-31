import { test, expect } from "../fixtures";
import { apiRequest } from "../helpers/api";
import { createLesson, createStudentFor, createVerifiedUser } from "../helpers/db";
import { generateCredentials } from "../helpers/auth";
import {
  currentWeekSlot,
  registerStudentDirect,
  seedStudentAuthInBrowser,
} from "../helpers/student";

test.describe(
  "Расписание ученика обновляется в реальном времени",
  { tag: ["@regression", "@pwa"] },
  () => {
    const setup = async () => {
      const { user, token: tutorToken } = await createVerifiedUser(
        generateCredentials("tutor"),
      );
      const { student } = await createStudentFor(user.id, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });
      const registered = await registerStudentDirect(student.id, {
        name: "Пётр Сидоров",
        email: `student-${Date.now()}@e2e.local`,
        isEmailVerified: true,
      });
      return { tutorId: user.id, tutorToken, studentId: student.id, registered };
    };

    test("учитель создаёт урок — у ученика он появляется без перезагрузки", async ({
      browser,
    }) => {
      const { tutorId, tutorToken, studentId, registered } = await setup();

      const studentContext = await browser.newContext();
      const studentPage = await studentContext.newPage();
      try {
        await seedStudentAuthInBrowser(studentPage, registered.token);
        await studentPage.goto("/student/cabinet/schedule");
        await expect(
          studentPage.getByRole("heading", { name: "Расписание" }),
        ).toBeVisible();
        await expect(studentPage.getByText("Физика")).toHaveCount(0);

        const slot = currentWeekSlot(13);
        await apiRequest("/api/lessons", {
          method: "POST",
          token: tutorToken,
          body: {
            tutorId,
            studentId,
            subject: "PHYSICS",
            lessonType: "SCHOOL",
            startTime: slot.start.toISOString(),
            endTime: slot.end.toISOString(),
            price: 1500,
          },
          expectStatus: 201,
        });

        await expect(studentPage.getByText("Физика")).toBeVisible({
          timeout: 10_000,
        });
      } finally {
        await studentContext.close();
      }
    });

    test("учитель удаляет урок — у ученика он исчезает без перезагрузки", async ({
      browser,
    }) => {
      const { tutorId, tutorToken, studentId, registered } = await setup();

      const slot = currentWeekSlot(13);
      const { lesson } = await createLesson({
        tutorId,
        studentId,
        startTime: slot.start,
        endTime: slot.end,
        subject: "PHYSICS",
        status: "SCHEDULED",
        price: 1500,
      });

      const studentContext = await browser.newContext();
      const studentPage = await studentContext.newPage();
      try {
        await seedStudentAuthInBrowser(studentPage, registered.token);
        await studentPage.goto("/student/cabinet/schedule");
        await expect(studentPage.getByText("Физика")).toBeVisible();

        await apiRequest(`/api/lessons/${lesson.id}`, {
          method: "DELETE",
          token: tutorToken,
        });

        await expect(studentPage.getByText("Физика")).toHaveCount(0, {
          timeout: 10_000,
        });
      } finally {
        await studentContext.close();
      }
    });
  },
);
