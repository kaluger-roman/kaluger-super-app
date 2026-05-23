import type { Page } from "@playwright/test";

export const fillDatePicker = async (
  page: Page,
  label: string,
  digits: string,
): Promise<void> => {
  const group = page.getByRole("group", { name: label });
  // MUI X v8: each editable section has role="spinbutton"
  const firstSection = group.locator('[role="spinbutton"]').first();
  await firstSection.waitFor({ state: "attached", timeout: 5000 });
  await firstSection.click();
  // Type digits — MUI X auto-advances between sections (DD MM YYYY)
  await page.keyboard.type(digits, { delay: 30 });
  await page.keyboard.press("Escape");
};
