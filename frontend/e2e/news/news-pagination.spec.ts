import { test, expect } from "../fixtures";
import { seedNews } from "../helpers/db";

test.describe("Пагинация ленты новостей", { tag: ["@regression", "@news"] }, () => {
  test("«Загрузить ещё» дозагружает следующую страницу и затем исчезает", async ({
    page,
    tutor,
  }) => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      title: `Новость №${String(i + 1).padStart(2, "0")}`,
      content: `Текст ${i + 1}`,
    }));
    await seedNews(items);

    await page.goto("/news");

    // Первая страница — 20 новейших; самая старая (№25) ещё не видна.
    await expect(page.getByText("Новость №01").first()).toBeVisible();
    await expect(page.getByText(/Новость №25/)).toHaveCount(0);

    await page.getByRole("button", { name: "Загрузить ещё" }).click();

    // После дозагрузки появляется старая запись, кнопка исчезает (последняя страница).
    await expect(page.getByText(/Новость №25/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Загрузить ещё" }),
    ).toHaveCount(0);
  });
});
