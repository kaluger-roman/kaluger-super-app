import type { Page } from "@playwright/test";

import { apiRequest } from "./api";

export const isTutorOnline = async (userId: string): Promise<boolean> => {
  const { connected } = await apiRequest<{ connected: boolean }>(
    `/api/__test__/ws/tutors/${userId}`
  );
  return connected;
};

export const confirmCall = async (page: Page): Promise<void> => {
  await page
    .getByRole("dialog", { name: "Начать видеозвонок?" })
    .getByRole("button", { name: "Позвонить" })
    .click();
};

// The student calls only from a lesson: open it in the schedule, press «Позвонить», confirm.
export const callTutorFromLesson = async (page: Page, subject: string): Promise<void> => {
  await page.getByRole("button", { name: new RegExp(subject) }).click();
  await page
    .getByRole("dialog", { name: "Урок" })
    .getByRole("button", { name: "Позвонить" })
    .click();
  await confirmCall(page);
};
