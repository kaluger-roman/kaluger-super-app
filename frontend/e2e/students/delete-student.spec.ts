import { test, expect } from "../fixtures";
import { createStudentFor, getStudentsFor } from "../helpers/db";

test.describe(
  "Удаление ученика",
  { tag: ["@regression", "@students"] },
  () => {
    test("учитель удаляет ученика — он исчезает из списка и из БД", async ({
      page,
      tutor,
    }) => {
      await createStudentFor(tutor.userId, {
        name: "Удаляемый Ученик",
        hourlyRate: 1500,
      });

      await page.goto("/students");
      await page.getByText("Удаляемый Ученик").click();

      const viewDialog = page.getByRole("dialog", { name: "Ученик" });
      await viewDialog.getByRole("button", { name: "Удалить" }).click();

      const deleteDialog = page.getByRole("dialog", {
        name: "Удалить ученика",
      });
      await deleteDialog.getByRole("button", { name: "Удалить" }).click();

      await expect(deleteDialog).toBeHidden();
      await expect(page.getByText("Удаляемый Ученик")).toHaveCount(0);

      await expect
        .poll(async () => {
          const { students } = await getStudentsFor(tutor.userId, false);
          return students.length;
        })
        .toBe(0);
    });
  },
);
