export type TestMailEntry = {
  to: string;
  subject: string;
  verificationCode?: string;
  resetUrl?: string;
  resetToken?: string;
  sentAt: Date;
};

const mailbox: TestMailEntry[] = [];

export const recordTestMail = (entry: Omit<TestMailEntry, "sentAt">): void => {
  mailbox.push({ ...entry, sentAt: new Date() });
};

export const findLatestMailFor = (email: string): TestMailEntry | undefined => {
  const normalized = email.trim().toLowerCase();
  for (let i = mailbox.length - 1; i >= 0; i -= 1) {
    if (mailbox[i].to.trim().toLowerCase() === normalized) {
      return mailbox[i];
    }
  }
  return undefined;
};

export const clearTestMailbox = (): void => {
  mailbox.length = 0;
};
