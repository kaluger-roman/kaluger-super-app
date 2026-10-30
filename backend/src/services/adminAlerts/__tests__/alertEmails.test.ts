import { prisma } from "../../../lib/prisma";
import { clearTestMailbox, findLatestMailFor } from "../../../lib/testMailbox";
import {
  acquireGlobalTestLock,
  GLOBAL_TEST_LOCK,
  GLOBAL_TEST_LOCK_TIMEOUT_MS,
  waitFor,
} from "../../../__tests__/helpers";
import { EmailSendError } from "../../../utils";
import * as emailModule from "../../email";
import type { AdminAlertDefinition } from "../adminAlerts.types";
import { dispatchAlertEmails } from "../alertEmails";
import { findActiveAlert, raiseAlert, resolveAlert } from "../alertLifecycle";
import { updateAdminSettings } from "../adminSettings";

const ADDRESS = "alerts-dispatch@example.com";
const NOW = new Date("2026-10-29T12:00:00.000Z");

const DEFINITION: AdminAlertDefinition = {
  type: "test_dispatch",
  severity: "critical",
  title: "Проверка рассылки",
};

const loadAlert = async (id: string) => prisma.adminAlert.findUniqueOrThrow({ where: { id } });

const sentSubjects = (spy: jest.SpyInstance): string[] =>
  spy.mock.calls.map(([letter]) => (letter as { subject: string }).subject);

describe("dispatchAlertEmails", () => {
  let releaseLock: () => Promise<void>;
  let sendSpy: jest.SpyInstance;

  beforeAll(async () => {
    releaseLock = await acquireGlobalTestLock(GLOBAL_TEST_LOCK.ADMIN_ALERTS);
  }, GLOBAL_TEST_LOCK_TIMEOUT_MS);

  beforeEach(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });
    clearTestMailbox();
    sendSpy = jest.spyOn(emailModule, "sendAdminEmail");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.adminAlert.deleteMany();
    await prisma.adminSettings.deleteMany();
    await releaseLock();
  });

  it("should send a pending open letter with a link to the admin", async () => {
    const alert = await raiseAlert(DEFINITION, { description: "Что-то сломалось" }, NOW);

    await dispatchAlertEmails();

    const stored = await loadAlert(alert.id);
    expect(stored).toMatchObject({ openEmailStatus: "sent", openEmailAttempts: 1 });
    const mail = findLatestMailFor(ADDRESS);
    expect(mail?.subject).toBe("[Критично] Проверка рассылки");
    expect(mail?.html).toContain("Что-то сломалось");
    expect(mail?.html).toMatch(/href="[^"]+\/admin"/);
  });

  it("should not send the same letter twice", async () => {
    await raiseAlert(DEFINITION, { description: "x" }, NOW);

    await dispatchAlertEmails();
    await dispatchAlertEmails();

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("should store a Resend error and retry on the next dispatch", async () => {
    sendSpy.mockRejectedValueOnce(new EmailSendError("Invalid API key"));
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);

    await dispatchAlertEmails();

    expect(await loadAlert(alert.id)).toMatchObject({
      openEmailStatus: "failed",
      openEmailAttempts: 1,
      openEmailError: "Invalid API key",
    });

    await dispatchAlertEmails();

    expect(await loadAlert(alert.id)).toMatchObject({
      openEmailStatus: "sent",
      openEmailAttempts: 2,
      openEmailError: null,
    });
  });

  it("should stop after 5 failed attempts", async () => {
    sendSpy.mockRejectedValue(new EmailSendError("Resend: 503 Service Unavailable"));
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);

    for (let run = 0; run < 7; run += 1) {
      await dispatchAlertEmails();
    }

    expect(sendSpy).toHaveBeenCalledTimes(5);
    expect(await loadAlert(alert.id)).toMatchObject({
      openEmailStatus: "failed",
      openEmailAttempts: 5,
      openEmailError: "Resend: 503 Service Unavailable",
    });
  });

  it("should send the open letter before the resolve letter", async () => {
    await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await resolveAlert(DEFINITION, new Date(NOW.getTime() + 1000));

    await dispatchAlertEmails();

    expect(sentSubjects(sendSpy)).toEqual([
      "[Критично] Проверка рассылки",
      "[Решено] Проверка рассылки",
    ]);
  });

  it("should send the resolve letter of an earlier episode before the next episode opens", async () => {
    const first = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await prisma.adminAlert.update({
      where: { id: first.id },
      data: { openEmailStatus: "sent", openEmailAttempts: 1 },
    });
    await resolveAlert(DEFINITION, new Date(NOW.getTime() + 1000));
    await raiseAlert(DEFINITION, { description: "снова" }, new Date(NOW.getTime() + 2000));

    await dispatchAlertEmails();

    expect(sentSubjects(sendSpy)).toEqual([
      "[Решено] Проверка рассылки",
      "[Критично] Проверка рассылки",
    ]);
  });

  it("should hold the resolve letter while the open letter still retries", async () => {
    sendSpy.mockRejectedValueOnce(new EmailSendError("timeout"));
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await resolveAlert(DEFINITION, new Date(NOW.getTime() + 1000));

    await dispatchAlertEmails();

    expect(await loadAlert(alert.id)).toMatchObject({
      openEmailStatus: "failed",
      resolveEmailStatus: "pending",
      resolveEmailAttempts: 0,
    });

    await dispatchAlertEmails();

    expect(await loadAlert(alert.id)).toMatchObject({
      openEmailStatus: "sent",
      resolveEmailStatus: "sent",
    });
  });

  it("should send the resolve letter once the open letter gave up", async () => {
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await prisma.adminAlert.update({
      where: { id: alert.id },
      data: { openEmailStatus: "failed", openEmailAttempts: 5 },
    });
    await resolveAlert(DEFINITION, new Date(NOW.getTime() + 1000));

    await dispatchAlertEmails();

    expect(sentSubjects(sendSpy)).toEqual(["[Решено] Проверка рассылки"]);
  });

  it("should send the resolve letter when the open letter was left pending without attempts", async () => {
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await prisma.adminAlert.update({
      where: { id: alert.id },
      data: { openEmailStatus: "pending", openEmailAttempts: 5 },
    });
    await resolveAlert(DEFINITION, new Date(NOW.getTime() + 1000));

    await dispatchAlertEmails();

    expect(sentSubjects(sendSpy)).toEqual(["[Решено] Проверка рассылки"]);
  });

  it("should skip a queued letter when the address was removed before the attempt", async () => {
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await updateAdminSettings({ alertEmail: null, alertEmailEnabled: true });

    await dispatchAlertEmails();

    expect(sendSpy).not.toHaveBeenCalled();
    expect((await loadAlert(alert.id)).openEmailStatus).toBe("skipped_no_email");
  });

  it("should skip a queued letter when mailing was switched off before the attempt", async () => {
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: false });

    await dispatchAlertEmails();

    expect(sendSpy).not.toHaveBeenCalled();
    expect((await loadAlert(alert.id)).openEmailStatus).toBe("skipped_disabled");
  });

  it("should skip the resolve letter of an alert whose open letter was skipped", async () => {
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await updateAdminSettings({ alertEmail: null, alertEmailEnabled: true });
    await resolveAlert(DEFINITION, new Date(NOW.getTime() + 1000));
    await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });
    await prisma.adminAlert.update({
      where: { id: alert.id },
      data: { openEmailStatus: "skipped_no_email" },
    });

    await dispatchAlertEmails();

    expect(sendSpy).not.toHaveBeenCalled();
    expect((await loadAlert(alert.id)).resolveEmailStatus).toBe("skipped_no_email");
  });

  it("should send nothing for an episode that opened without an address", async () => {
    await updateAdminSettings({ alertEmail: null, alertEmailEnabled: true });
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    await updateAdminSettings({ alertEmail: ADDRESS, alertEmailEnabled: true });

    await dispatchAlertEmails();
    await resolveAlert(DEFINITION, new Date(NOW.getTime() + 1000));
    await dispatchAlertEmails();

    expect(sendSpy).not.toHaveBeenCalled();
    expect(await loadAlert(alert.id)).toMatchObject({
      openEmailStatus: "skipped_no_email",
      resolveEmailStatus: "skipped_no_email",
    });
  });

  it("should send a letter once when two dispatches run at the same time", async () => {
    await raiseAlert(DEFINITION, { description: "x" }, NOW);

    await Promise.all([dispatchAlertEmails(), dispatchAlertEmails(), dispatchAlertEmails()]);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect((await findActiveAlert(DEFINITION.type))?.openEmailAttempts).toBe(1);
  });

  it("should not resend a letter still in flight when another dispatch starts", async () => {
    let finishSend: () => void = () => undefined;
    sendSpy.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishSend = resolve;
        })
    );
    await raiseAlert(DEFINITION, { description: "x" }, NOW);

    const first = dispatchAlertEmails();
    const second = dispatchAlertEmails();
    await waitFor(() => sendSpy.mock.calls.length > 0);
    finishSend();
    await Promise.all([first, second]);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect((await findActiveAlert(DEFINITION.type))?.openEmailStatus).toBe("sent");
  });

  it("should not count a failed status write after a sent letter as a delivery error", async () => {
    const alert = await raiseAlert(DEFINITION, { description: "x" }, NOW);
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(prisma.adminAlert, "update").mockRejectedValueOnce(new Error("db is down"));

    await dispatchAlertEmails();

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(await loadAlert(alert.id)).toMatchObject({
      openEmailStatus: "pending",
      openEmailAttempts: 1,
      openEmailError: null,
    });
  });
});
