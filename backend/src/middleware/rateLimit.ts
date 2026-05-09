import rateLimit from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const isTestEnv = process.env.NODE_ENV === "test";

const baseConfig = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
};

export const authRateLimiter = rateLimit({
  ...baseConfig,
  max: 20,
  message: { error: "Слишком много попыток. Попробуйте позже" },
});

export const adminLoginRateLimiter = rateLimit({
  ...baseConfig,
  max: 5,
  message: { error: "Слишком много попыток. Попробуйте позже" },
});
