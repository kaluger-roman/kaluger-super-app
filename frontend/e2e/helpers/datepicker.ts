import type { Page } from "@playwright/test";

// The pickers are typed digit by digit, so a date becomes DDMMYYYY.
export const formatDdMmYyyy = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");

  return `${dd}${mm}${String(date.getFullYear())}`;
};

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

// MUI X DateTimePicker (ru-locale): DD MM YYYY HH MM — pass 12 digits.
// Escape is intentionally NOT pressed — when the picker lives inside a Dialog,
// Escape closes the surrounding Dialog as well (MUI default behavior).
// Tab is pressed at the end to commit the value (otherwise the picker keeps
// the value "in progress" and the surrounding form may not see the change).
export const fillDateTimePicker = async (
  page: Page,
  label: string,
  digits: string,
): Promise<void> => {
  const group = page.getByRole("group", { name: label });
  const firstSection = group.locator('[role="spinbutton"]').first();
  await firstSection.waitFor({ state: "attached", timeout: 5000 });
  await firstSection.click();
  await page.keyboard.type(digits, { delay: 30 });
  await page.keyboard.press("Tab");
};
