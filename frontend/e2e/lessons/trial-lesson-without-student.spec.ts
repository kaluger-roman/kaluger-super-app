import { test, expect } from "../fixtures";
import { getLessonsFor } from "../helpers/db";

test.describe(
  "Пробный урок без создания ученика",
  { tag: ["@regression", "@lessons"] },
  () => {
    test("учитель создаёт пробный урок без ученика и видит его с пометкой, список учеников не меняется", async ({
      page,
      tutor,
    }) => {
      await page.goto("/lessons");

      await page.getByRole("button", { name: "Создать урок" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Создать новый урок")).toBeVisible();

      await dialog.getByLabel("Пробный урок", { exact: true }).check();

      await expect(dialog.getByRole("combobox", { name: /Ученик/ })).toBeHidden();
      await expect(
        dialog.getByLabel("Регулярное занятие (еженедельно)"),
      ).toBeHidden();

      await dialog.getByLabel(/Имя ученика/).fill("Пётр Пробников");
      await dialog.getByLabel("Телефон").fill("+79990001122");

      await dialog.getByRole("button", { name: "Создать урок" }).click();

      await expect(dialog).toBeHidden();

      await expect(page.getByText("Пётр Пробников").first()).toBeVisible();
      await expect(page.getByText("Пробный").first()).toBeVisible();

      const { lessons } = await getLessonsFor(tutor.userId);
      const trialLesson = lessons.find(
        (l) => l.prospectName === "Пётр Пробников",
      );
      expect(trialLesson).toBeDefined();
      expect(trialLesson?.studentId).toBeNull();
      expect(Number(trialLesson?.price ?? -1)).toBe(0);

      await page.goto("/students");
      await expect(page.getByText("Пётр Пробников")).toBeHidden();
    });
  },
);
