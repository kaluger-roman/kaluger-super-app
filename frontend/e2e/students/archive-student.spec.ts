import { test, expect } from "../fixtures";
import { createStudentFor, getStudentsFor } from "../helpers/db";

test.describe(
  "Архивирование ученика",
  { tag: ["@regression", "@students"] },
  () => {
    test("учитель архивирует ученика с причиной — он исчезает из активных и появляется в архиве", async ({
      page,
      tutor,
    }) => {
      await createStudentFor(tutor.userId, { name: "Архивируемый Ученик" });

      await page.goto("/students");
      await expect(page.getByRole("tab", { name: "Активные" })).toBeVisible();

      await page.getByText("Архивируемый Ученик").click();

      const viewDialog = page.getByRole("dialog");
      await expect(viewDialog).toBeVisible();

      await viewDialog.getByRole("button", { name: "В архив" }).click();

      const archiveDialog = page.getByRole("dialog", {
        name: "Архивировать ученика",
      });
      await expect(archiveDialog).toBeVisible();

      await archiveDialog
        .getByLabel(/Причина архивирования/)
        .click();
      await page.getByRole("option", { name: "Закончил обучение" }).click();

      await archiveDialog.getByRole("button", { name: "В архив" }).click();

      await expect(archiveDialog).not.toBeVisible();

      await page.getByRole("tab", { name: "Архив" }).click();
      await expect(page.getByText("Архивируемый Ученик")).toBeVisible();

      const { students } = await getStudentsFor(tutor.userId, true);
      expect(students.some((s) => s.name === "Архивируемый Ученик")).toBe(true);
    });
  },
);
