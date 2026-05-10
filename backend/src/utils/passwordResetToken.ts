import crypto from "crypto";

export const RESET_TOKEN_TTL_MINUTES = 15;
export const RESET_REQUEST_COOLDOWN_SECONDS = 60;

export const createResetToken = (): { token: string; tokenHash: string } => {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  return { token, tokenHash };
};

export const hashResetToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getResetTokenExpiry = (): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + RESET_TOKEN_TTL_MINUTES);
  return expiry;
};

export const isResetTokenExpired = (expiry: Date): boolean =>
  new Date() > expiry;
