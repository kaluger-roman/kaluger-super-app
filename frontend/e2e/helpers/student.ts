import type { Page } from "@playwright/test";
import { apiRequest } from "./api";

export const STUDENT_PASSWORD = "StrongPass1";

export type RegisteredStudent = {
  studentUser: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
  };
  token: string;
  verificationCode: string | null;
};

// Creates a StudentUser linked to an existing student card directly via the
// test router — avoids the invite+register HTTP dance and the rate limiters,
// and lets a test pin email verification state deterministically.
export const registerStudentDirect = async (
  studentId: string,
  input: {
    name: string;
    email: string;
    isEmailVerified?: boolean;
    withCode?: boolean;
  },
): Promise<RegisteredStudent> =>
  apiRequest<RegisteredStudent>(
    `/api/__test__/students/${studentId}/student-user`,
    {
      method: "POST",
      body: { ...input, password: STUDENT_PASSWORD },
      expectStatus: 201,
    },
  );

export const seedStudentAuthInBrowser = async (
  page: Page,
  token: string,
): Promise<void> => {
  await page.addInitScript((studentToken) => {
    window.localStorage.setItem("studentToken", studentToken);
  }, token);
};

export const deleteStudentCard = async (
  tutorToken: string,
  studentId: string,
): Promise<void> => {
  await apiRequest(`/api/students/${studentId}`, {
    method: "DELETE",
    token: tutorToken,
  });
};

const HOUR_MS = 60 * 60 * 1000;

// Wednesday of the current ISO week at the given hour — always inside the
// [Monday, Monday+7) window that the student schedule API queries, so a seeded
// lesson reliably shows up in the default ("this week") view.
export const currentWeekSlot = (
  hour = 12,
): { start: Date; end: Date } => {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday + 2);
  d.setHours(hour, 0, 0, 0);
  return { start: new Date(d), end: new Date(d.getTime() + HOUR_MS) };
};

export const nextWeekSlot = (hour = 12): { start: Date; end: Date } => {
  const { start, end } = currentWeekSlot(hour);
  return {
    start: new Date(start.getTime() + 7 * 24 * HOUR_MS),
    end: new Date(end.getTime() + 7 * 24 * HOUR_MS),
  };
};
