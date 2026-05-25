import { test, expect } from "../fixtures";
import {
  clearBackupFiles,
  issueAdminToken,
  seedAdminAuthInBrowser,
} from "../helpers/auth";

test.describe(
  "Ручное создание бэкапа БД",
  { tag: ["@regression", "@admin"] },
  () => {
    test("админ нажимает «Создать бэкап» и видит новый файл в списке", async ({
      page,
    }) => {
      await clearBackupFiles();

      const adminToken = await issueAdminToken();
      await seedAdminAuthInBrowser(page, adminToken);

      await page.goto("/admin");

      await expect(
        page.getByRole("heading", { name: "Админ-панель" }),
      ).toBeVisible();

      await page.getByRole("tab", { name: "Бэкапы" }).click();

      await expect(page.getByText("Нет бэкапов")).toBeVisible();

      await page.getByRole("button", { name: "Создать бэкап" }).click();

      const backupRow = page.locator("text=/backup-.*\\.sql\\.gz/").first();
      await expect(backupRow).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/^Последний бэкап:/)).toBeVisible();
    });
  },
);
