import { prisma } from "../../../lib/prisma";
import { clearTestMailbox, findLatestMailFor } from "../../../lib/testMailbox";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
} from "../../../__tests__/helpers";
import {
  EmailSendError,
  AlertEmailNotConfiguredError,
  TestEmailRateLimitError,
} from "../../../utils";
import * as emailModule from "../../email";
import { getAdminSettings, sendTestEmail, updateAdminSettings } from "../adminSettings";

const ADDRESS = "alerts-settings@example.com";

describe("adminSettings", () => {
  let releaseLock: () => Promise<void>;

  beforeAll(async () => {
    releaseLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    await prisma.adminSettings.deleteMany();
    clearTestMailbox();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  afterAll(async () => {
    await prisma.adminSettings.deleteMany();
    await releaseLock();
  });

  describe("getAdminSettings", () => {
    it("should create the defaults on first read", async () => {
      const settings = await getAdminSettings();

      expect(settings).toMatchObject({ alertEmail: null, alertEmailEnabled: true });
      expect(await prisma.adminSettings.count()).toBe(1);
    });

    it("should not create duplicates on concurrent first reads", async () => {
      await Promise.all([getAdminSettings(), getAdminSettings(), getAdminSettings()]);

      expect(await prisma.adminSettings.count()).toBe(1);
    });
  });

  describe("updateAdminSettings", () => {
    it("should store the address and the switch", async () => {
      await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: false });

      expect(await getAdminSettings()).toMatchObject({
        alertEmail: ADDRESS,
        alertEmailEnabled: false,
      });
    });

    it("should clear a saved address with null", async () => {
      await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });

      await updateAdminSettings({ alertEmail: null, alertEmailEnabled: true });

      expect((await getAdminSettings()).alertEmail).toBeNull();
    });
  });

  describe("sendTestEmail", () => {
    it("should send the test letter to the saved address", async () => {
      await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });

      await expect(sendTestEmail()).resolves.toEqual({ sentTo: ADDRESS });

      const mail = findLatestMailFor(ADDRESS);
      expect(mail?.subject).toBe("Тестовое письмо от админки");
      expect(mail?.html).toContain("/admin");
    });

    it("should send the test letter even when mailing is switched off", async () => {
      await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: false });

      await sendTestEmail();

      expect(findLatestMailFor(ADDRESS)?.subject).toBe("Тестовое письмо от админки");
    });

    it("should refuse without a saved address", async () => {
      await expect(sendTestEmail()).rejects.toBeInstanceOf(AlertEmailNotConfiguredError);
    });

    it("should allow one test letter per minute", async () => {
      await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });
      const start = Date.now();
      jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });

      jest.setSystemTime(start);
      await sendTestEmail();
      jest.setSystemTime(start + 59_999);
      await expect(sendTestEmail()).rejects.toBeInstanceOf(TestEmailRateLimitError);

      jest.setSystemTime(start + 60_000);
      await expect(sendTestEmail()).resolves.toEqual({ sentTo: ADDRESS });
    });

    it("should count a failed attempt against the limit", async () => {
      await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });
      jest
        .spyOn(emailModule, "sendAdminEmail")
        .mockRejectedValueOnce(new EmailSendError("Invalid API key"));

      await expect(sendTestEmail()).rejects.toThrow("Invalid API key");
      await expect(sendTestEmail()).rejects.toBeInstanceOf(TestEmailRateLimitError);
    });
  });
});
