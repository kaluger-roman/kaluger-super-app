const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ADMIN_JWT_SECRET",
  "STUDENT_JWT_SECRET",
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

export const validateRequiredEnv = (): void => {
  const missing: RequiredEnvVar[] = [];
  for (const name of REQUIRED_ENV_VARS) {
    if (!process.env[name] || process.env[name]?.trim() === "") {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    const message =
      `Missing required environment variables: ${missing.join(", ")}. ` +
      "See backend/.env.example. Refusing to start.";
    throw new Error(message);
  }
};
