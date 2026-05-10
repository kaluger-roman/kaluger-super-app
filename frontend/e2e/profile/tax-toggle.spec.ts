import { test, expect } from "../fixtures";
import { setTaxPeriodsFor } from "../helpers/db";

test.describe(
  "Включение и выключение учёта налога",
  { tag: ["@regression", "@profile"] },
  () => {
    test("учитель включает учёт налога при наличии периодов", async ({
      page,
      tutor,
    }) => {
      await setTaxPeriodsFor(
        tutor.userId,
        [{ startDate: "2024-01-01", rate: 4 }],
        false,
      );

      await page.goto("/profile");
      await page
        .getByRole("tab", { name: "Финансы" })
        .click({ timeout: 15_000 });

      await expect(page.getByText(/4%/)).toBeVisible();

      const taxSwitch = page.getByRole("checkbox").first();
      await expect(taxSwitch).not.toBeChecked();

      await taxSwitch.click({ force: true });

      await expect(taxSwitch).toBeChecked();
    });

    test("учитель не может включить учёт налога без настроенных периодов", async ({
      page,
      tutor: _tutor,
    }) => {
      await page.goto("/profile");
      await page
        .getByRole("tab", { name: "Финансы" })
        .click({ timeout: 15_000 });

      const taxSwitch = page.getByRole("checkbox").first();
      await expect(taxSwitch).toBeVisible();
      await expect(taxSwitch).not.toBeChecked();

      await taxSwitch.click({ force: true });

      await expect(
        page.getByText(/добавьте хотя бы один период/i),
      ).toBeVisible();
      await expect(taxSwitch).not.toBeChecked();
    });
  },
);
