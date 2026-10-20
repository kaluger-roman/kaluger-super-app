import { test, expect } from "../fixtures";
import { clearBackupFiles, issueAdminToken, seedAdminAuthInBrowser } from "../helpers/auth";

test.describe(
  "Гарантия хранения и резервное хранилище бэкапов",
  { tag: ["@regression", "@admin"] },
  () => {
    test("админ открывает «Бэкапы» и видит гарантию 30 дней и предупреждения о резервном хранилище", async ({
      page,
    }) => {
      await clearBackupFiles();

      const adminToken = await issueAdminToken();
      await seedAdminAuthInBrowser(page, adminToken);

      await page.goto("/admin");
      await page.getByRole("tab", { name: "Бэкапы" }).click();

      await expect(
        page.getByText("Бэкапы младше 30 дней не удаляются независимо от лимита размера")
      ).toBeVisible();
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Резервное хранилище: копирование ещё не выполнялось" })
      ).toBeVisible();
      await expect(
        page.getByRole("alert").filter({ hasText: "Проверка восстановления: ещё не выполнялась" })
      ).toBeVisible();
      await expect(page.getByText(/^Лимит превышен/)).toHaveCount(0);
    });
  }
);
