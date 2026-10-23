import { findPublicUrlProblem } from "./frontendUrl";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "ADMIN_JWT_SECRET",
  "STUDENT_JWT_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "FRONTEND_URL",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
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

// The deploy checks the server's .env before it migrates and restarts the app, so a broken config
// fails the deploy instead of the live app. A dev value left there would send students and reset
// emails to localhost. Not checked on start: the QA stack runs production builds on localhost.
export const validateDeployEnv = (): void => {
  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      `NODE_ENV must be "production" on the server (got "${process.env.NODE_ENV ?? ""}").`
    );
  }
  validateRequiredEnv();
  const url = process.env.FRONTEND_URL ?? "";
  const problem = findPublicUrlProblem(url);
  if (problem) {
    throw new Error(
      `FRONTEND_URL ${problem} on the server (got "${url}"). ` +
        "Links in emails and student invitations would not open."
    );
  }
};
