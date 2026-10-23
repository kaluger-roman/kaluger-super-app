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
  // A dev value left in the production .env sends students and reset emails to localhost.
  if (process.env.NODE_ENV === "production") {
    const url = process.env.FRONTEND_URL ?? "";
    const problem = findPublicUrlProblem(url);
    if (problem) {
      throw new Error(
        `FRONTEND_URL ${problem} in production (got "${url}"). ` +
          "Links in emails and student invitations would not open. Refusing to start."
      );
    }
  }
};

// The deploy checks the server's .env before it restarts the app, so a broken config fails the
// deploy instead of taking the live app down.
export const validateDeployEnv = (): void => {
  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      `NODE_ENV must be "production" on the server (got "${process.env.NODE_ENV ?? ""}").`
    );
  }
  validateRequiredEnv();
};
