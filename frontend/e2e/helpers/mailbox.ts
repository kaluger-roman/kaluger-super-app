import { apiRequest } from "./api";

export type MailboxEntry = {
  to: string;
  subject: string;
  verificationCode?: string;
  resetUrl?: string;
  resetToken?: string;
  sentAt: string;
};

export const fetchLatestMail = async (
  email: string,
): Promise<MailboxEntry | null> => {
  try {
    return await apiRequest<MailboxEntry>(
      `/api/__test__/mailbox/${encodeURIComponent(email)}`,
    );
  } catch {
    return null;
  }
};

export const waitForMail = async (
  email: string,
  predicate: (entry: MailboxEntry) => boolean = () => true,
  timeoutMs = 5_000,
): Promise<MailboxEntry> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const entry = await fetchLatestMail(email);
    if (entry && predicate(entry)) {
      return entry;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`No mail for ${email} within ${timeoutMs}ms`);
};

export const clearMailbox = async (): Promise<void> => {
  await apiRequest("/api/__test__/mailbox", { method: "DELETE" });
};
