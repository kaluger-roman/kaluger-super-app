import crypto from "crypto";

import { getFrontendUrl } from "./frontendUrl";

export const INVITATION_TTL_DAYS = 365;

export const createInvitationToken = (): {
  token: string;
  tokenHash: string;
} => {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(token);
  return { token, tokenHash };
};

export const hashInvitationToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getInvitationExpiry = (): Date => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + INVITATION_TTL_DAYS);
  return expiry;
};

export const isInvitationExpired = (expiry: Date): boolean => new Date() > expiry;

export const buildInviteUrl = (token: string): string =>
  `${getFrontendUrl()}/student-invite/${token}`;
