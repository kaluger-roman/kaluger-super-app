import { test, expect } from "../fixtures";
import { apiRequest } from "../helpers/api";
import { seedNews } from "../helpers/db";

test.describe("Лента новостей", { tag: ["@regression", "@news"] }, () => {
  test("учитель открывает страницу новостей — записи отображаются и badge непрочитанного сбрасывается", async ({
    page,
    tutor,
  }) => {
    await seedNews([
      { title: "Релиз 1.2", content: "Добавили **темы**" },
      { title: "Релиз 1.1", content: "Исправлен баг" },
      { title: "Релиз 1.0", content: "Запуск" },
    ]);

    await page.goto("/");

    const hasUnreadBefore = await apiRequest<{ hasUnread: boolean }>(
      "/api/news/has-unread",
      { token: tutor.token },
    );
    expect(hasUnreadBefore.hasUnread).toBe(true);

    const markReadDone = page.waitForResponse(
      (resp) =>
        resp.url().includes("/news/mark-read") &&
        resp.request().method() === "POST",
    );

    await page.goto("/news");
    await markReadDone;

    await expect(page.getByText("Релиз 1.2").first()).toBeVisible();
    await expect(page.getByText("Релиз 1.1").first()).toBeVisible();
    await expect(page.getByText("Релиз 1.0").first()).toBeVisible();

    const hasUnreadAfter = await apiRequest<{ hasUnread: boolean }>(
      "/api/news/has-unread",
      { token: tutor.token },
    );
    expect(hasUnreadAfter.hasUnread).toBe(false);
  });
});
