import crypto from "crypto";

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
