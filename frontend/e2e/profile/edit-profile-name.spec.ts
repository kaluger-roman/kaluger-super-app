import { test, expect } from "../fixtures";

test.describe(
  "Редактирование имени профиля",
  { tag: ["@regression", "@profile"] },
  () => {
    test("учитель меняет имя и оно сохраняется", async ({ page, tutor }) => {
      await page.goto("/profile");
      await page.getByRole("tab", { name: "Мои данные" }).click();

      const main = page.getByRole("main");

      await page.getByRole("button", { name: "Редактировать" }).click();
      await main.getByRole("textbox").fill("Новое Имя");
      await page.getByRole("button", { name: "Сохранить" }).click();

      await expect(main.getByText("Новое Имя")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Редактировать" }),
      ).toBeVisible();

      await page.reload();
      await page.getByRole("tab", { name: "Мои данные" }).click();
      await expect(main.getByText("Новое Имя")).toBeVisible();
    });

    test("учитель отменяет редактирование — имя не меняется", async ({
      page,
      tutor,
    }) => {
      await page.goto("/profile");
      await page.getByRole("tab", { name: "Мои данные" }).click();

      const main = page.getByRole("main");

      await page.getByRole("button", { name: "Редактировать" }).click();
      await main.getByRole("textbox").fill("Зря Изменено");
      await page.getByRole("button", { name: "Отмена" }).click();

      await expect(main.getByText(tutor.credentials.name)).toBeVisible();
      await expect(main.getByText("Зря Изменено")).toHaveCount(0);
    });
  },
);
