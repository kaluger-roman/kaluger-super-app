import { test, expect } from "../fixtures";
import { clearAdminAlerts, runAlertChecks } from "../helpers/admin";
import { clearBackupFiles, issueAdminToken, seedAdminAuthInBrowser } from "../helpers/auth";
import { waitForMail } from "../helpers/mailbox";

test.describe("Алерты админки и уведомления на почту", { tag: ["@regression", "@admin"] }, () => {
  test("админ сохраняет адрес, получает тестовое письмо, видит алерты и отмечает их прочитанными", async ({
    page,
  }) => {
    const alertEmail = `alerts-${Date.now()}@e2e.local`;
    await clearAdminAlerts();
    await clearBackupFiles();

    const adminToken = await issueAdminToken();
    await seedAdminAuthInBrowser(page, adminToken);
    await page.goto("/admin");

    await page.getByRole("tab", { name: "Настройки" }).click();
    await page.getByLabel("Email для уведомлений").fill(alertEmail);
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("Настройки сохранены")).toBeVisible();

    await page.getByRole("button", { name: "Отправить тестовое письмо" }).click();
    await expect(page.getByText(`Письмо отправлено на ${alertEmail}`)).toBeVisible();
    await waitForMail(alertEmail, (mail) => mail.subject === "Тестовое письмо от админки");

    await runAlertChecks(["offsite_stale", "restore_check_stale"]);
    await waitForMail(alertEmail, (mail) => mail.subject.startsWith("[Предупреждение]"));

    await page.getByRole("tab", { name: "Обзор" }).click();
    await expect(page.getByText(/Есть активные проблемы:\s*2/)).toBeVisible();
    await expect(page.getByLabel("Непрочитанных алертов: 2")).toBeVisible();

    await page.getByRole("button", { name: "Открыть алерты" }).click();
    await expect(page.getByText("Резервное хранилище давно не обновлялось")).toBeVisible();
    await expect(page.getByText("Проверка восстановления давно не выполнялась")).toBeVisible();

    await page
      .getByRole("button", { name: /^Прочитано: / })
      .first()
      .click();
    await expect(page.getByLabel("Непрочитанных алертов: 1")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Прочитано: / })).toHaveCount(1);
  });
});
