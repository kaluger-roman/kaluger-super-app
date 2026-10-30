import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AlertEmailNotConfiguredError, TestEmailRateLimitError, getFrontendUrl } from "../../utils";
import { sendAdminEmail } from "../email";
import { ADMIN_SETTINGS_ID, TEST_EMAIL_INTERVAL_MS } from "./adminAlerts.constants";
import { buildTestEmail } from "./adminAlerts.helpers";
import type { AlertEmailSettings } from "./adminAlerts.types";

export const getAdminSettings = async () => {
  try {
    return await prisma.adminSettings.upsert({
      where: { id: ADMIN_SETTINGS_ID },
      update: {},
      create: { id: ADMIN_SETTINGS_ID, alertEmail: null, alertEmailEnabled: true },
    });
  } catch (err) {
    // Prisma 6 upsert is select-then-insert: a parallel first call can lose the INSERT race
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return prisma.adminSettings.findUniqueOrThrow({ where: { id: ADMIN_SETTINGS_ID } });
    }
    throw err;
  }
};

// Both fields are always written: a `null` address clears the saved one.
export const updateAdminSettings = async ({
  alertEmail,
  alertEmailEnabled,
}: AlertEmailSettings) => {
  await getAdminSettings();
  return prisma.adminSettings.update({
    where: { id: ADMIN_SETTINGS_ID },
    data: { alertEmail, alertEmailEnabled },
  });
};

export const getAdminUrl = (): string => `${getFrontendUrl()}/admin`;

// A failed attempt also counts against the limit, so repeated clicks cannot hammer Resend.
export const sendTestEmail = async (): Promise<{ sentTo: string }> => {
  const { alertEmail } = await getAdminSettings();
  if (!alertEmail) {
    throw new AlertEmailNotConfiguredError();
  }

  const now = new Date();
  const { count } = await prisma.adminSettings.updateMany({
    where: {
      id: ADMIN_SETTINGS_ID,
      OR: [
        { testEmailSentAt: null },
        { testEmailSentAt: { lte: new Date(now.getTime() - TEST_EMAIL_INTERVAL_MS) } },
      ],
    },
    data: { testEmailSentAt: now },
  });
  if (count === 0) {
    throw new TestEmailRateLimitError();
  }

  await sendAdminEmail({ to: alertEmail, ...buildTestEmail(getAdminUrl()) });
  return { sentTo: alertEmail };
};
