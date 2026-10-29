import { expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

import { API_URL, apiRequest } from "./api";
import { createStudentFor } from "./db";
import { fakeSinkPushManager } from "./sink-push-manager";
import { isStudentOnline, registerStudentDirect, seedStudentAuthInBrowser } from "./student";

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

// The page reports itself hidden the way a minimized app or a locked phone does.
export const emulateVisibility = async (page: Page, hidden: boolean): Promise<void> => {
  await page.evaluate((isHidden) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (isHidden ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => isHidden });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
};

// The server drops the participant's socket without a close handshake, like a lost network.
export const dropSocket = async (kind: "students" | "tutors", id: string): Promise<void> => {
  const { dropped } = await apiRequest<{ dropped: boolean }>(
    `/api/__test__/ws/${kind}/${id}/drop`,
    {
      method: "POST",
    }
  );
  expect(dropped).toBe(true);
};

export type ConnectedCall = {
  studentPage: Page;
  studentUserId: string;
};

// The tutor calls a fresh student from the student card, the student accepts, media connects.
export const connectTutorStudentCall = async (
  page: Page,
  studentContext: BrowserContext,
  tutorId: string,
  studentName: string,
  emailPrefix: string
): Promise<ConnectedCall> => {
  const { student } = await createStudentFor(tutorId, { name: studentName });
  const { token, studentUser } = await registerStudentDirect(student.id, {
    name: studentName,
    email: `${emailPrefix}-${Date.now()}@e2e.local`,
    isEmailVerified: true,
  });

  const studentPage = await studentContext.newPage();
  await seedStudentAuthInBrowser(studentPage, token);
  await studentPage.goto("/student/cabinet/schedule");
  await expect(studentPage.getByText("Кабинет ученика")).toBeVisible();
  await expect(
    studentPage.getByRole("banner").getByRole("button", { name: "Позвонить" })
  ).toHaveCount(0);
  // The student can take the call only once its socket is registered on the server.
  await expect.poll(() => isStudentOnline(studentUser.id)).toBe(true);

  await page.goto("/students");
  await page.getByText(studentName).click();
  await page.getByRole("dialog").getByRole("button", { name: "Видеозвонок" }).click();
  const confirm = page.getByRole("dialog", { name: "Начать видеозвонок?" });
  await expect(confirm).toContainText(studentName);
  await expect(confirm).not.toContainText("Звонок по уроку");
  await expect(page.getByText("Вызываем…")).toBeHidden();
  await confirmCall(page);
  await expect(page.getByText("Вызываем…")).toBeVisible();

  await expect(studentPage.getByText("Входящий вызов")).toBeVisible();
  await expect(studentPage.getByText("Звонок по уроку")).toBeHidden();
  await studentPage.getByRole("button", { name: "Принять вызов" }).click();

  await expect(page.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
  await expect(studentPage.getByRole("button", { name: "Завершить звонок" })).toBeVisible();
  // Media connected: the call leaves the connecting state on both sides.
  await expect(page.getByText("Соединение…")).toBeHidden();
  await expect(studentPage.getByText("Соединение…")).toBeHidden();
  return { studentPage, studentUserId: studentUser.id };
};

export type SinkPush = {
  ttl: string | null;
  urgency: string | null;
  topic: string | null;
  // What the service worker gets: the notification opens `data.url`.
  payload: { data: { type: string; callId: string; url: string } };
};

// A subscription whose push service is the e2e backend's own sink: the backend really encrypts and
// sends the push, and the sink keeps what arrived under `key`.
export const seedSinkSubscription = async (studentUserId: string, key: string): Promise<void> => {
  await apiRequest("/api/__test__/push-subscriptions", {
    method: "POST",
    body: { endpoint: `${API_URL}/api/__test__/push-sink/${key}`, studentUserId },
    expectStatus: 201,
  });
};

export const sinkPushes = async (key: string): Promise<SinkPush[]> => {
  const { pushes } = await apiRequest<{ pushes: SinkPush[] }>(`/api/__test__/push-sink/${key}`);
  return pushes;
};

// The e2e backend sends web push only with VAPID keys (E2E env: VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT).
export const isWebPushConfigured = async (): Promise<boolean> => {
  const { configured } = await apiRequest<{ configured: boolean }>("/api/push/vapid-key");
  return configured;
};

export const seedTutorSinkSubscription = async (userId: string, key: string): Promise<void> => {
  await apiRequest("/api/__test__/push-subscriptions", {
    method: "POST",
    body: { endpoint: `${API_URL}/api/__test__/push-sink/${key}`, userId },
    expectStatus: 201,
  });
};

export const installSinkPushManager = async (
  context: BrowserContext,
  key: string
): Promise<void> => {
  await context.addInitScript(fakeSinkPushManager, {
    endpoint: `${API_URL}/api/__test__/push-sink/${key}`,
    storageKey: "e2eSinkPushKeys",
    permissionKey: "e2eSinkPushPermission",
  });
};
