import { test, expect } from "../fixtures";
import { createStudentFor, getStudentsFor } from "../helpers/db";

test.describe(
  "Восстановление ученика из архива",
  { tag: ["@regression", "@students"] },
  () => {
    test("учитель возвращает ученика из архива — он снова в активных", async ({
      page,
      tutor,
    }) => {
      await createStudentFor(tutor.userId, {
        name: "Архивный Ученик",
        hourlyRate: 1500,
        archived: true,
      });

      await page.goto("/students");
      await page.getByRole("tab", { name: "Архив" }).click();
      await page.getByText("Архивный Ученик").click();

      const viewDialog = page.getByRole("dialog", { name: "Ученик" });
      await viewDialog.getByRole("button", { name: "Из архива" }).click();

      const unarchiveDialog = page.getByRole("dialog", {
        name: "Разархивировать ученика",
      });
      await unarchiveDialog.getByRole("button", { name: "Из архива" }).click();

      await expect(unarchiveDialog).toBeHidden();

      await expect
        .poll(async () => {
          const { students } = await getStudentsFor(tutor.userId, false);
          return students.some((s) => s.name === "Архивный Ученик");
        })
        .toBe(true);

      await page.getByRole("tab", { name: "Активные" }).click();
      await expect(page.getByText("Архивный Ученик")).toBeVisible();
    });
  },
);
