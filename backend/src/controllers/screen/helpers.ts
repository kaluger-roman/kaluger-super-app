import { createHmac } from "crypto";

const SCREEN_SECRET = process.env.SCREEN_SECRET || "screen-monitoring-secret-key";

export const generateScreenToken = (userId: string): string => {
  const signature = createHmac("sha256", SCREEN_SECRET)
    .update(userId)
    .digest("hex")
    .slice(0, 16);
  return `${userId}.${signature}`;
};

export const verifyScreenToken = (token: string): string | null => {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const userId = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  const expected = createHmac("sha256", SCREEN_SECRET)
    .update(userId)
    .digest("hex")
    .slice(0, 16);

  if (signature !== expected) return null;
  return userId;
};
