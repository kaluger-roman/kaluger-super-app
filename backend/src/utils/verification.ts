import crypto from "crypto";

export const MAX_VERIFICATION_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

export const generateVerificationCode = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const getVerificationCodeExpiry = (): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);
  return expiry;
};

export const isVerificationCodeExpired = (expiry: Date): boolean => {
  return new Date() > expiry;
};

export const isWithinResendCooldown = (sentAt: Date | null): boolean => {
  if (!sentAt) return false;
  const elapsedMs = Date.now() - sentAt.getTime();
  return elapsedMs < RESEND_COOLDOWN_SECONDS * 1000;
};
