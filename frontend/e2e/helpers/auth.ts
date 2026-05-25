import type { Page } from "@playwright/test";
import { apiRequest } from "./api";
import { createVerifiedUser } from "./db";
import { waitForMail } from "./mailbox";

export type AuthCredentials = {
  email: string;
  password: string;
  name: string;
};

const randomSuffix = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const generateCredentials = (
  prefix = "tutor",
): AuthCredentials => ({
  email: `${prefix}-${randomSuffix()}@e2e.local`,
  password: "Password123",
  name: `${prefix} ${randomSuffix()}`,
});

export const loginViaApi = async (
  email: string,
  password: string,
): Promise<{ token: string; userId: string }> => {
  const result = await apiRequest<{
    token: string;
    user: { id: string };
  }>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    expectStatus: 200,
  });
  return { token: result.token, userId: result.user.id };
};

export const registerViaApi = async (
  credentials: AuthCredentials,
): Promise<void> => {
  await apiRequest("/api/auth/register", {
    method: "POST",
    body: credentials,
    expectStatus: 201,
  });
};

export const fetchVerificationCode = async (email: string): Promise<string> => {
  const entry = await waitForMail(
    email,
    (m) => Boolean(m.verificationCode) && m.subject === "Подтверждение email",
  );
  return entry.verificationCode!;
};

export const verifyEmailViaApi = async (
  email: string,
  code: string,
): Promise<{ token: string }> =>
  apiRequest<{ token: string }>("/api/auth/verify-email", {
    method: "POST",
    body: { email, code },
    expectStatus: 200,
  });

export const seedAuthInBrowser = async (
  page: Page,
  token: string,
): Promise<void> => {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem("authToken", authToken);
  }, token);
};

export const createAndLoginTutor = async (
  page: Page,
  options: { taxEnabled?: boolean; prefix?: string } = {},
): Promise<{
  credentials: AuthCredentials;
  userId: string;
  token: string;
}> => {
  const credentials = generateCredentials(options.prefix);
  const { user, token } = await createVerifiedUser({
    ...credentials,
    taxEnabled: options.taxEnabled,
  });
  await seedAuthInBrowser(page, token);
  return { credentials, userId: user.id, token };
};

export const issueAdminToken = async (): Promise<string> => {
  const { token } = await apiRequest<{ token: string }>(
    "/api/__test__/admin/token",
    { method: "POST", expectStatus: 201 },
  );
  return token;
};

export const seedAdminAuthInBrowser = async (
  page: Page,
  token: string,
): Promise<void> => {
  await page.addInitScript((adminToken) => {
    window.localStorage.setItem("adminToken", adminToken);
  }, token);
};

export const clearBackupFiles = async (): Promise<void> => {
  await apiRequest("/api/__test__/backup/files", { method: "DELETE" });
};
