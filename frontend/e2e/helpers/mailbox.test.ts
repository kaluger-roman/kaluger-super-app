import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchLatestMail, waitForMail } from "./mailbox";

const mail = {
  to: "tutor@e2e.local",
  subject: "Код подтверждения",
  verificationCode: "123456",
  sentAt: "2026-10-16T10:00:00.000Z",
};

const respondWith = (status: number, body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status }))
  );

describe("mailbox helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return the latest mail when the mailbox has one", async () => {
    respondWith(200, mail);

    await expect(fetchLatestMail(mail.to)).resolves.toEqual(mail);
  });

  it("should return null instead of the 404 error body when there is no mail", async () => {
    respondWith(404, { error: "Письмо не найдено" });

    await expect(fetchLatestMail(mail.to)).resolves.toBeNull();
  });

  it("should keep waiting and time out when no mail ever arrives", async () => {
    respondWith(404, { error: "Письмо не найдено" });

    await expect(waitForMail(mail.to, undefined, 300)).rejects.toThrow(
      `No mail for ${mail.to} within 300ms`
    );
  });
});
