import { test, expect } from "../fixtures";
import { createStudentFor } from "../helpers/db";

test.describe(
  "Учитель выпускает пригласительную ссылку для ученика",
  { tag: ["@regression", "@students"] },
  () => {
    test("учитель открывает карточку, выпускает invite и копирует ссылку", async ({
      page,
      context,
      tutor,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await createStudentFor(tutor.userId, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });

      await page.goto("/students");
      await page.getByText("Пётр Сидоров").click();

      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button", { name: "Создать ссылку-приглашение" })
        .click();

      const inviteField = dialog.getByRole("textbox");
      await expect(inviteField).toHaveValue(/\/student-invite\//);

      await dialog
        .locator('button:has([data-testid="ContentCopyIcon"])')
        .click();

      const clipboard = await page.evaluate(() =>
        navigator.clipboard.readText(),
      );
      expect(clipboard).toMatch(/\/student-invite\//);
    });

    test("учитель отзывает выпущенную ссылку — статус возвращается к «не выдана»", async ({
      page,
      tutor,
    }) => {
      await createStudentFor(tutor.userId, {
        name: "Пётр Сидоров",
        hourlyRate: 1500,
      });

      await page.goto("/students");
      await page.getByText("Пётр Сидоров").click();

      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button", { name: "Создать ссылку-приглашение" })
        .click();

      await expect(dialog.getByRole("textbox")).toHaveValue(
        /\/student-invite\//,
      );

      await dialog
        .getByRole("button", { name: "Отозвать", exact: true })
        .click();

      await expect(
        dialog.getByRole("button", { name: "Создать ссылку-приглашение" }),
      ).toBeVisible();
    });
  },
);
